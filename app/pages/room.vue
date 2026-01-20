<template>
  <div class="chat-layout">
    
    <header class="chat-header">
      <button class="btn-icon" @click="leaveRoom">⬅️</button>
      
      <div class="room-info">
        <h2># {{ currentRoomId }}</h2>
        <span class="status-dot"></span> <small>En ligne</small>
      </div>

      <div class="header-actions">
        <button class="btn-icon" @click="goToGallery" title="Voir la galerie">
          🖼️
        </button>
      </div>
    </header>

    <div class="messages-container" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        <p>👋 C'est le début de la discussion dans <strong>{{ currentRoomId }}</strong>.</p>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        <div v-if="msg.isSystem" class="system-message">ℹ️ {{ msg.text }}</div>

        <div v-else class="message-wrapper" :class="{ 'my-msg': isMe(msg.author) }">
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
      
      <input 
        type="file" 
        ref="fileInput" 
        accept="image/*" 
        style="display: none" 
        @change="handleFileSelect"
      />

      <button type="button" class="btn-icon-action" @click="triggerFile" title="Choisir une image">
        📁
      </button>

      <button type="button" class="btn-icon-action" @click="toggleCam" title="Prendre une photo">
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

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

// --- 1. DONNÉES ---
const currentRoomId = computed(() => (route.params.id as string) || 'general');
const messages = computed(() => chatStore.messages[currentRoomId.value] || []);
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// Variables Caméra & Fichier
const showCam = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null); // Référence vers l'input caché
let stream: MediaStream | null = null;

// --- 2. LIFECYCLE ---
onMounted(() => {
  if (!chatStore.currentUser) { router.push('/'); return; }
  chatStore.connectToServer(currentRoomId.value);
  scrollToBottom();
});

onUpdated(() => scrollToBottom());
onBeforeUnmount(() => stopCam());

// --- 3. ACTIONS NAVIGATION ---
function leaveRoom() { router.push('/'); }

// NOUVEAU : Fonction pour aller à la galerie
function goToGallery() {
  // Tu devras créer cette page "pages/gallery.vue" ou adapter le lien
  router.push('/gallery'); 
  // Si la page n'existe pas encore, tu peux mettre un alert pour tester :
  // alert("Vers la galerie (Page à créer)");
}

// --- 4. LOGIQUE MESSAGES ---
function isMe(author: string) { return author === chatStore.currentUser?.username; }
function formatTime(isoDate: string) { return isoDate ? new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  });
}

function sendMessage() {
  if (!newMessage.value.trim()) return;
  chatStore.sendMessage(currentRoomId.value, newMessage.value);
  newMessage.value = '';
}

// --- 5. LOGIQUE FICHIER (PC/UPLOAD) ---

// Fonction qui simule un clic sur l'input caché
function triggerFile() {
  fileInput.value?.click();
}

// Fonction appelée quand l'utilisateur a choisi une image
function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0]; // On prend le premier fichier

  if (file) {
    // On utilise FileReader pour lire le fichier et le convertir en Base64
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      // On envoie direct (comme pour la caméra)
      chatStore.sendMessage(currentRoomId.value, '', base64String);
    };
    
    reader.readAsDataURL(file); // Lance la lecture
  }
  
  // On reset l'input pour pouvoir ré-uploader le même fichier si besoin
  target.value = '';
}

// --- 6. LOGIQUE CAMÉRA (LIVE) ---
async function toggleCam() {
  showCam.value = true;
  await nextTick();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if(videoEl.value) videoEl.value.srcObject = stream;
  } catch(e) { console.error(e); showCam.value = false; alert("Erreur caméra"); }
}
function stopCam() {
  if(stream) stream.getTracks().forEach(t => t.stop());
  stream = null; showCam.value = false;
}
function takePhoto() {
  if(!videoEl.value || !canvasEl.value) return;
  const vid = videoEl.value;
  const cvs = canvasEl.value;
  cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
  const ctx = cvs.getContext('2d');
  if(ctx) ctx.drawImage(vid, 0, 0);
  const photoBase64 = cvs.toDataURL('image/jpeg', 0.7);
  chatStore.sendMessage(currentRoomId.value, '', photoBase64);
  stopCam();
}
</script>

<style scoped>
/* --- LAYOUT --- */
.chat-layout {
  display: flex; flex-direction: column; height: 100vh; height: 100dvh;
  background-color: #e5ddd5; font-family: -apple-system, sans-serif; overflow: hidden;
}

/* --- HEADER --- */
.chat-header {
  flex-shrink: 0; height: 60px; background: #075e54; color: white;
  display: flex; align-items: center; padding: 0 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1); z-index: 10; justify-content: space-between;
}
.room-info { flex-grow: 1; margin-left: 15px; }
.room-info h2 { margin: 0; font-size: 1.1rem; }
.btn-icon { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: white; padding: 0 10px; }

/* --- MESSAGES --- */
.messages-container {
  flex-grow: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 8px;
  background-color: #e5ddd5; background-image: linear-gradient(#d4c6b8 1px, transparent 1px), linear-gradient(90deg, #d4c6b8 1px, transparent 1px); background-size: 20px 20px;
  -webkit-overflow-scrolling: touch;
}
.empty-state { text-align: center; color: #888; background: rgba(255,255,255,0.8); padding: 10px; border-radius: 8px; align-self: center; margin-top: 20px; }
.system-message { text-align: center; font-size: 0.75rem; background: #dcf8c6; padding: 4px 12px; border-radius: 12px; align-self: center; margin: 10px 0; color: #555; }

/* --- BULLES --- */
.message-wrapper { display: flex; max-width: 85%; align-items: flex-end; }
.message-wrapper.my-msg { align-self: flex-end; flex-direction: row-reverse; }
.avatar-mini { width: 28px; height: 28px; background: #bdc3c7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 8px; color: white; font-size: 0.8rem; font-weight: bold; flex-shrink: 0; }
.message-bubble { background: white; padding: 8px 10px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); position: relative; min-width: 80px; }
.my-msg .message-bubble { background: #dcf8c6; }
.author-name { font-size: 0.75rem; font-weight: bold; color: #e67e22; margin-bottom: 4px; }
.msg-image { max-width: 100%; border-radius: 6px; margin-bottom: 5px; display: block; }
.msg-text { margin: 0; font-size: 0.95rem; line-height: 1.4; color: #333; }
.timestamp { display: block; font-size: 0.65rem; text-align: right; color: #999; margin-top: 4px; }

/* --- INPUT AREA --- */
.input-area {
  flex-shrink: 0; background: #f0f0f0; padding: 8px 10px; display: flex; gap: 8px; align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
}
/* Style commun pour les boutons (Dossier et Caméra) */
.btn-icon-action {
  background: none; border: none; font-size: 1.5rem; cursor: pointer; padding: 5px; 
  transition: transform 0.1s;
}
.btn-icon-action:active { transform: scale(0.9); }

.msg-input { flex-grow: 1; padding: 10px 15px; border-radius: 20px; border: none; outline: none; font-size: 1rem; background: white; }
.btn-send { background: #075e54; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.btn-send:disabled { background: #ccc; cursor: default; }

/* --- CAM OVERLAY --- */
.cam-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 100; display: flex; flex-direction: column; }
.cam-video { width: 100%; flex: 1; object-fit: cover; }
.cam-controls { height: 100px; display: flex; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.5); }
.btn-snap { width: 70px; height: 70px; border-radius: 50%; background: white; border: 4px solid #ccc; cursor: pointer; }
.btn-cancel { position: absolute; left: 20px; color: white; background: none; border: none; font-size: 1rem; cursor: pointer; }
</style>