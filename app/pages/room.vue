<template>
  <div class="app-container">
    
    <header class="top-bar">
      <div class="left-actions">
        <button class="btn-icon back-btn" @click="leaveRoom">
          <i class="icon">❮</i>
        </button>
        <div class="room-identity">
          <div class="room-avatar">#</div>
          <div class="room-text">
            <h2 class="room-name">{{ currentRoomId }}</h2>
            <span class="status">En ligne</span>
          </div>
        </div>
      </div>

      <button class="btn-icon gallery-btn" @click="goToGallery" title="Ouvrir la galerie">
        🖼️
      </button>
    </header>

    <div class="chat-area" ref="messagesContainer">
      
      <div v-if="messages.length === 0" class="empty-placeholder">
        <span class="placeholder-icon">👋</span>
        <p>Lancez la discussion dans <strong>{{ currentRoomId }}</strong> !</p>
      </div>

      <template v-for="msg in messages" :key="msg.id">
        
        <div v-if="msg.isSystem" class="system-badge">
          {{ msg.text }}
        </div>

        <div 
          v-else 
          class="msg-row" 
          :class="{ 'msg-me': isMe(msg.author) }"
        >
          <div v-if="!isMe(msg.author)" class="user-avatar">
             {{ msg.author.charAt(0).toUpperCase() }}
          </div>

          <div class="bubble">
            <span v-if="!isMe(msg.author)" class="sender-name">{{ msg.author }}</span>

            <div v-if="msg.photo" class="media-content">
              <img :src="msg.photo" alt="Shared content" loading="lazy" />
            </div>

            <p v-if="msg.text" class="text-content">{{ msg.text }}</p>
            
            <span class="time-tick">{{ formatTime(msg.date) }}</span>
          </div>
        </div>

      </template>
    </div>

    <div class="action-bar">
      
      <input 
        type="file" 
        ref="fileInput" 
        accept="image/*" 
        class="hidden-input"
        @change="handleFileSelect"
      />

      <button class="action-btn secondary" @click="triggerFile" title="Envoyer une image">
        📷
      </button>

      <button class="action-btn secondary" @click="toggleCam" title="Prendre une photo">
        📸
      </button>

      <div class="input-wrapper">
        <input 
          v-model="newMessage" 
          type="text" 
          placeholder="Votre message..." 
          @keyup.enter="sendMessage"
        />
      </div>

      <button 
        class="action-btn primary send-btn" 
        @click="sendMessage" 
        :disabled="!newMessage.trim()"
      >
        ➤
      </button>
    </div>

    <div v-if="showCam" class="camera-overlay">
      <video ref="videoEl" autoplay playsinline class="video-feed"></video>
      <canvas ref="canvasEl" style="display:none"></canvas>
      
      <div class="overlay-controls">
        <button class="control-btn cancel" @click="stopCam">✕</button>
        <button class="control-btn snap" @click="takePhoto"></button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, nextTick, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

// --- INITIALISATION ---
const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

// --- DONNÉES ---
const currentRoomId = computed(() => (route.params.id as string) || 'general');
// On récupère les messages du store (Le store gère l'anti-doublon)
const messages = computed(() => chatStore.messages[currentRoomId.value] || []);

// Variables UI
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Variables Caméra
const showCam = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;

// --- CYCLE DE VIE ---
onMounted(() => {
  if (!chatStore.currentUser) { router.push('/'); return; }
  
  // Connexion propre (le store nettoie les anciens écouteurs)
  chatStore.connectToServer(currentRoomId.value);
  scrollToBottom();
});

onUpdated(() => scrollToBottom());
onBeforeUnmount(() => stopCam());

// --- NAVIGATION ---
function leaveRoom() { router.push('/'); }

function goToGallery() {
  // Redirection vers la page galerie (assure-toi de créer le fichier pages/gallery.vue plus tard)
  router.push('/gallery');
}

// --- UTILITAIRES ---
function isMe(author: string) { return author === chatStore.currentUser?.username; }
function formatTime(d: string) { return d ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; }
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  });
}

// --- ENVOI MESSAGE ---
function sendMessage() {
  if (!newMessage.value.trim()) return;
  // On envoie au serveur. ON N'AJOUTE PAS LOCALEMENT (Anti-doublon)
  chatStore.sendMessage(currentRoomId.value, newMessage.value);
  newMessage.value = '';
}

// --- GESTION FICHIER (PC) ---
function triggerFile() { fileInput.value?.click(); }

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      chatStore.sendMessage(currentRoomId.value, '', base64);
    };
    reader.readAsDataURL(file);
  }
  target.value = '';
}

// --- GESTION CAMERA (MOBILE) ---
async function toggleCam() {
  showCam.value = true;
  await nextTick();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if(videoEl.value) videoEl.value.srcObject = stream;
  } catch(e) { showCam.value = false; alert("Erreur caméra"); }
}

function stopCam() {
  if(stream) stream.getTracks().forEach(t => t.stop());
  showCam.value = false;
}

function takePhoto() {
  if(!videoEl.value || !canvasEl.value) return;
  const vid = videoEl.value;
  const cvs = canvasEl.value;
  cvs.width = vid.videoWidth; cvs.height = vid.videoHeight;
  cvs.getContext('2d')?.drawImage(vid, 0, 0);
  const base64 = cvs.toDataURL('image/jpeg', 0.6);
  chatStore.sendMessage(currentRoomId.value, '', base64);
  stopCam();
}
</script>

<style scoped>
/* =========================================
   DESIGN SYSTEM : MODERN SOCIAL APP
   ========================================= */

/* --- CONTAINER GLOBAL --- */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh; /* Mobile friendly */
  background-color: #f0f2f5; /* Gris très clair (style Facebook/Messenger) */
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* --- HEADER --- */
.top-bar {
  flex-shrink: 0;
  height: 64px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px); /* Effet verre */
  border-bottom: 1px solid rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  z-index: 10;
  box-shadow: 0 2px 10px rgba(0,0,0,0.03);
}

.left-actions { display: flex; align-items: center; gap: 12px; }

.back-btn {
  background: none; border: none; font-size: 1.2rem; cursor: pointer; color: #333;
  padding: 8px; border-radius: 50%; transition: background 0.2s;
}
.back-btn:active { background: #eee; }

.room-identity { display: flex; align-items: center; gap: 10px; }
.room-avatar {
  width: 40px; height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Dégradé Violet */
  color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 1.2rem;
}
.room-text { display: flex; flex-direction: column; }
.room-name { margin: 0; font-size: 1rem; font-weight: 700; color: #222; text-transform: capitalize; }
.status { font-size: 0.75rem; color: #4caf50; font-weight: 500; }

.gallery-btn {
  background: #f0f2f5; border: none; font-size: 1.2rem; cursor: pointer;
  width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.gallery-btn:hover { background: #e4e6eb; transform: scale(1.05); }

/* --- MESSAGES AREA --- */
.chat-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #f9f9f9;
}

.empty-placeholder {
  text-align: center; margin-top: 40px; color: #888;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.placeholder-icon { font-size: 3rem; }

/* Message Row */
.msg-row { display: flex; align-items: flex-end; gap: 8px; margin-bottom: 4px; max-width: 85%; }

/* Message MOI (Droite) */
.msg-row.msg-me {
  align-self: flex-end;
  flex-direction: row-reverse;
}

/* Avatars */
.user-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #ccc; color: white; font-size: 0.7rem; font-weight: bold;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  margin-bottom: 4px;
}

/* Bulles */
.bubble {
  padding: 10px 14px;
  border-radius: 18px;
  position: relative;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  background: white;
  color: #1c1e21;
}

/* Style spécifique pour MOI (Dégradé Bleu/Violet) */
.msg-me .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px; /* Coin carré */
}

/* Style pour les AUTRES */
.msg-row:not(.msg-me) .bubble {
  background: #fff;
  border-bottom-left-radius: 4px; /* Coin carré */
}

.sender-name {
  display: block; font-size: 0.7rem; color: #666; margin-bottom: 4px; font-weight: 600;
}
.msg-me .sender-name { display: none; } /* Pas de nom pour moi */

/* Images dans le chat */
.media-content img {
  border-radius: 12px; margin-bottom: 5px; max-width: 100%; display: block;
}

.text-content { margin: 0; font-size: 0.95rem; line-height: 1.4; word-break: break-word; }

.time-tick {
  font-size: 0.65rem; display: block; text-align: right; margin-top: 4px; opacity: 0.7;
}

.system-badge {
  align-self: center; background: rgba(0,0,0,0.05); color: #666;
  font-size: 0.75rem; padding: 4px 12px; border-radius: 20px; margin: 10px 0;
}

/* --- ACTION BAR (INPUT) --- */
.action-bar {
  flex-shrink: 0;
  background: white;
  padding: 10px 16px;
  display: flex; align-items: center; gap: 10px;
  border-top: 1px solid rgba(0,0,0,0.05);
  padding-bottom: max(10px, env(safe-area-inset-bottom));
}

.hidden-input { display: none; }

.action-btn {
  border: none; cursor: pointer; transition: transform 0.1s;
  display: flex; align-items: center; justify-content: center;
}
.action-btn:active { transform: scale(0.9); }

.action-btn.secondary {
  background: transparent; font-size: 1.4rem; padding: 6px; color: #65676b;
}

.input-wrapper {
  flex-grow: 1;
  background: #f0f2f5;
  border-radius: 20px;
  padding: 8px 15px;
  display: flex; align-items: center;
}
.input-wrapper input {
  width: 100%; border: none; background: transparent; outline: none; font-size: 0.95rem;
}

.send-btn {
  width: 40px; height: 40px; border-radius: 50%;
  background: #667eea; color: white; font-size: 1.1rem;
  box-shadow: 0 2px 5px rgba(102, 126, 234, 0.4);
}
.send-btn:disabled { background: #ccc; box-shadow: none; cursor: default; }

/* --- CAMERA OVERLAY --- */
.camera-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: #000; z-index: 100; display: flex; flex-direction: column;
}
.video-feed { flex: 1; object-fit: cover; }
.overlay-controls {
  height: 120px; display: flex; align-items: center; justify-content: center; position: relative;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
}
.control-btn {
  border: none; cursor: pointer; transition: transform 0.2s;
}
.control-btn.snap {
  width: 72px; height: 72px; border-radius: 50%; background: white;
  border: 4px solid rgba(255,255,255,0.3);
}
.control-btn.cancel {
  position: absolute; left: 30px; background: rgba(255,255,255,0.2);
  color: white; width: 40px; height: 40px; border-radius: 50%; font-size: 1.2rem;
}
</style>