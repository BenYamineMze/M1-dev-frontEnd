<template>
  <div class="chat-layout">
    
    <header class="chat-header">
      <button class="btn-icon" @click="leaveRoom">⬅️</button>
      
      <div class="room-info">
        <h2># {{ currentRoomId }}</h2>
        <span class="status-dot"></span> <small>En ligne</small>
      </div>
    </header>

    <div class="messages-container" ref="messagesContainer">
      
      <div v-if="messages.length === 0" class="empty-state">
        <p>👋 C'est le début de la discussion dans <strong>{{ currentRoomId }}</strong>.</p>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        
        <div v-if="msg.isSystem" class="system-message">
           ℹ️ {{ msg.text }}
        </div>

        <div 
          v-else
          class="message-wrapper"
          :class="{ 'my-msg': isMe(msg.author) }" 
        >
          <div v-if="!isMe(msg.author)" class="avatar-mini">
             {{ msg.author.charAt(0).toUpperCase() }}
          </div>

          <div class="message-bubble">
            <div v-if="!isMe(msg.author)" class="author-name">{{ msg.author }}</div>

            <div v-if="msg.photo" class="msg-image-container">
              <img :src="msg.photo" class="msg-image" alt="Image envoyée" />
            </div>

            <p v-if="msg.text" class="msg-text">{{ msg.text }}</p>

            <span class="timestamp">{{ formatTime(msg.date) }}</span>
          </div>
        </div>

      </template>
    </div>

    <div class="input-area">
      <button type="button" class="btn-icon-cam" @click="toggleCam">
        📷
      </button>

      <input 
        v-model="newMessage" 
        type="text" 
        placeholder="Message..." 
        class="msg-input"
        @keyup.enter="sendMessage"
      />

      <button class="btn-send" @click="sendMessage" :disabled="!newMessage.trim()">
        ➤
      </button>
    </div>

    <div v-if="showCam" class="cam-overlay">
      <video ref="videoEl" autoplay playsinline class="cam-video"></video>
      
      <canvas ref="canvasEl" style="display:none"></canvas>
      
      <div class="cam-controls">
        <button class="btn-cancel" @click="stopCam">Annuler</button>
        <button class="btn-snap" @click="takePhoto"></button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

// --- INITIALISATION DES OUTILS ---
const route = useRoute();   // Pour lire l'URL actuelle
const router = useRouter(); // Pour changer de page
const chatStore = useChatStore(); // Pour accéder aux données globales (Pinia)

// --- 1. LOGIQUE ROOM DYNAMIQUE ---
// On récupère l'ID depuis l'URL (ex: /room/sport -> id = sport)
// Si pas d'ID, on met 'general' par sécurité.
const currentRoomId = computed(() => (route.params.id as string) || 'general');

// --- 2. VARIABLES RÉACTIVES (STATE LOCAL) ---
const newMessage = ref(''); // Ce que l'utilisateur tape
const messagesContainer = ref<HTMLElement | null>(null); // Référence vers la div de scroll

// Variables techniques pour la caméra
const showCam = ref(false); // Est-ce que la caméra est ouverte ?
const videoEl = ref<HTMLVideoElement | null>(null); // Lien vers la balise <video>
const canvasEl = ref<HTMLCanvasElement | null>(null); // Lien vers la balise <canvas>
let stream: MediaStream | null = null; // Stocke le flux brut de la caméra

// --- 3. CONNEXION AUX DONNÉES DU STORE ---
// On demande au store : "Donne-moi uniquement les messages de la room actuelle"
// 'computed' assure que si un nouveau message arrive, la liste se met à jour toute seule.
const messages = computed(() => chatStore.messages[currentRoomId.value] || []);

// --- 4. CYCLE DE VIE (LIFECYCLE) ---

// Au chargement de la page...
onMounted(() => {
  // SÉCURITÉ : Si l'utilisateur a rafraîchi la page et perdu son pseudo
  if (!chatStore.currentUser) {
    router.push('/'); // On le renvoie à l'accueil
    return;
  }
  
  // ACTION CRUCIALE : On dit au serveur Socket.IO "Connecte-moi à CETTE room spécifique"
  chatStore.connectToServer(currentRoomId.value);
  
  // On scroll tout en bas pour voir les derniers messages
  scrollToBottom();
});

// À chaque fois que le composant se met à jour (nouveau message)...
onUpdated(() => {
  scrollToBottom();
});

// Quand on quitte la page...
onBeforeUnmount(() => {
  stopCam(); // On n'oublie pas d'éteindre la caméra pour économiser la batterie
});

// --- 5. FONCTIONS MÉTIER ---

// Retour à l'accueil
function leaveRoom() {
  router.push('/');
}

// Vérifie si le message vient de moi (pour l'afficher à droite en vert)
function isMe(author: string) {
  return author === chatStore.currentUser?.username;
}

// Formate la date ISO (2023-10-01T12:00:00) en heure lisible (12:00)
function formatTime(isoDate: string) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Fonction utilitaire pour scroller en bas de la div
function scrollToBottom() {
  nextTick(() => { // nextTick attend que le DOM soit mis à jour par Vue
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// --- 6. ENVOI DE MESSAGE ---

function sendMessage() {
  // Vérification : Pas de message vide
  if (!newMessage.value.trim()) return;
  
  // Appel au Store pour envoyer le message au serveur
  chatStore.sendMessage(currentRoomId.value, newMessage.value);
  
  // On vide le champ de saisie
  newMessage.value = '';
}

// --- 7. LOGIQUE CAMÉRA (AVANCÉ) ---

async function toggleCam() {
  showCam.value = true;
  await nextTick(); // On attend que la balise <video> apparaisse
  
  try {
    // API NAVIGATEUR : On demande l'accès à la caméra
    // facingMode: 'environment' cherche la caméra arrière sur mobile
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'environment' } 
    });
    
    // On branche le flux caméra directement dans la balise <video>
    if(videoEl.value) videoEl.value.srcObject = stream;
  } catch(e) { 
    console.error("Erreur caméra:", e); 
    showCam.value = false;
    alert("Impossible d'accéder à la caméra (Vérifiez les permissions HTTPS).");
  }
}

// Éteint la caméra proprement
function stopCam() {
  if(stream) {
    // On arrête toutes les pistes (tracks) vidéo
    stream.getTracks().forEach(t => t.stop());
  }
  stream = null;
  showCam.value = false;
}

// Prend la photo
function takePhoto() {
  if(!videoEl.value || !canvasEl.value) return;
  
  const vid = videoEl.value;
  const cvs = canvasEl.value;
  
  // 1. On configure le canvas à la taille de la vidéo
  cvs.width = vid.videoWidth;
  cvs.height = vid.videoHeight;
  
  // 2. On "dessine" l'image actuelle de la vidéo sur le canvas
  const ctx = cvs.getContext('2d');
  if(ctx) ctx.drawImage(vid, 0, 0);
  
  // 3. On convertit le dessin en chaîne de caractères Base64 (image/jpeg)
  const photoBase64 = cvs.toDataURL('image/jpeg', 0.7); // Qualité 0.7 (compression)
  
  // 4. On envoie via le socket
  // Note : On envoie un texte vide (''), car le 3ème argument est la photo
  chatStore.sendMessage(currentRoomId.value, '', photoBase64);
  
  // 5. On ferme la caméra
  stopCam();
}
</script>

<style scoped>
/* --- LAYOUT GLOBAL --- */
.chat-layout {
  display: flex; flex-direction: column; 
  height: 100vh; 
  height: 100dvh; /* dvh = Dynamic Viewport Height (mieux pour mobile) */
  background-color: #e5ddd5; 
  font-family: -apple-system, sans-serif;
  overflow: hidden; /* Pas de scroll global, seulement dans les messages */
}

/* --- HEADER --- */
.chat-header {
  flex-shrink: 0; /* Ne doit pas rétrécir */
  height: 60px; background: #075e54; color: white;
  display: flex; align-items: center; padding: 0 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 10;
}
.room-info { flex-grow: 1; margin-left: 15px; }
.btn-icon { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: white; }

/* --- MESSAGES CONTAINER --- */
.messages-container {
  flex-grow: 1; /* Prend tout l'espace restant */
  overflow-y: auto; /* Active le scroll vertical */
  padding: 15px;
  display: flex; flex-direction: column; gap: 8px;
  
  /* Fond texturé style WhatsApp avec CSS gradients */
  background-color: #e5ddd5;
  background-image: linear-gradient(#d4c6b8 1px, transparent 1px), linear-gradient(90deg, #d4c6b8 1px, transparent 1px);
  background-size: 20px 20px;
  
  /* Scroll fluide sur iOS */
  -webkit-overflow-scrolling: touch;
}

/* --- STYLES DES BULLES --- */
.message-wrapper {
  display: flex; max-width: 85%; align-items: flex-end;
}
/* Si c'est mon message : alignement à droite et ordre inversé */
.message-wrapper.my-msg {
  align-self: flex-end; flex-direction: row-reverse;
}

.avatar-mini {
  width: 28px; height: 28px; background: #bdc3c7; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 8px; font-weight: bold; color: white; font-size: 0.8rem;
  flex-shrink: 0;
}

.message-bubble {
  background: white; padding: 8px 10px; border-radius: 8px;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative;
  min-width: 80px;
}
/* Couleur verte pour mes messages */
.my-msg .message-bubble { background: #dcf8c6; }

.author-name {
  font-size: 0.75rem; font-weight: bold; color: #e67e22; margin-bottom: 4px;
}
.msg-image {
  max-width: 100%; border-radius: 6px; margin-bottom: 5px; display: block;
}
.msg-text { margin: 0; font-size: 0.95rem; line-height: 1.4; color: #333; }
.timestamp {
  display: block; font-size: 0.65rem; text-align: right; color: #999; margin-top: 4px;
}
.system-message {
  text-align: center; font-size: 0.75rem; color: #555;
  background-color: #dcf8c6; padding: 4px 12px; border-radius: 12px;
  align-self: center; margin: 10px 0;
}

/* --- INPUT AREA --- */
.input-area {
  flex-shrink: 0; background: #f0f0f0; padding: 8px 10px; display: flex; gap: 10px; align-items: center;
  /* padding-bottom pour éviter que la barre de l'iPhone X cache l'input */
  padding-bottom: env(safe-area-inset-bottom); 
}

.btn-icon-cam {
  background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 5px;
}

.msg-input {
  flex-grow: 1; padding: 10px 15px; border-radius: 20px; border: none; outline: none;
  font-size: 1rem; background: white;
}

.btn-send {
  background: #075e54; color: white; border: none;
  width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
}
.btn-send:disabled { background: #ccc; cursor: default; }

/* --- OVERLAY CAMERA --- */
.cam-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: black; z-index: 100; display: flex; flex-direction: column;
}
.cam-video { width: 100%; flex: 1; object-fit: cover; }
.cam-controls {
  height: 100px; display: flex; align-items: center; justify-content: center;
  position: relative; background: rgba(0,0,0,0.5);
}
.btn-snap {
  width: 70px; height: 70px; border-radius: 50%; background: white;
  border: 4px solid #ccc; cursor: pointer;
}
.btn-cancel {
  position: absolute; left: 20px; color: white; background: none; border: none; font-size: 1rem; cursor: pointer;
}
</style>