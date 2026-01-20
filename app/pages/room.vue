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
        <p>👋 Discussion vide...</p>
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
              <img :src="msg.photo" class="msg-image" alt="Image reçue" />
            </div>

            <p v-if="msg.text" class="msg-text">{{ msg.text }}</p>

            <span class="timestamp">{{ formatTime(msg.date) }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="input-area">
      
      <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleFileSelect" />

      <button class="btn-icon-action" @click="triggerFile" title="Envoyer image">
        🖼️
      </button>

      <button class="btn-icon-action" @click="toggleCam" title="Prendre photo">
        📷
      </button>

      <input 
        v-model="newMessage" 
        type="text" 
        placeholder="Message..." 
        class="msg-input"
        @keyup.enter="sendMessage"
      />

      <button class="btn-send" @click="sendMessage">➤</button>
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

// 1. Récupération ID Room
const currentRoomId = computed(() => (route.params.id as string) || 'general');
const messages = computed(() => chatStore.messages[currentRoomId.value] || []);

// 2. Variables
const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Variables Caméra
const showCam = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;

// --- LIFECYCLE ---
onMounted(() => {
  if (!chatStore.currentUser) { router.push('/'); return; }
  
  // On se connecte. Le store gère le nettoyage des doublons.
  chatStore.connectToServer(currentRoomId.value);
  scrollToBottom();
});

onUpdated(() => scrollToBottom());
onBeforeUnmount(() => stopCam());

// --- ACTIONS ---
function leaveRoom() { router.push('/'); }
function isMe(author: string) { return author === chatStore.currentUser?.username; }
function formatTime(d: string) { return d ? new Date(d).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''; }

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  });
}

// --- ENVOI TEXTE ---
function sendMessage() {
  if (!newMessage.value.trim()) return;
  // On envoie juste le texte
  chatStore.sendMessage(currentRoomId.value, newMessage.value);
  newMessage.value = '';
}

// --- ENVOI IMAGE (GALERIE) ---
function triggerFile() {
  fileInput.value?.click(); // Ouvre la fenêtre de sélection
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (file) {
    // Conversion du fichier en Base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      // ENVOI : roomId, texte vide, photo remplie
      chatStore.sendMessage(currentRoomId.value, '', base64);
    };
    reader.readAsDataURL(file);
  }
  target.value = ''; // Reset
}

// --- CAMÉRA ---
async function toggleCam() {
  showCam.value = true;
  await nextTick();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if(videoEl.value) videoEl.value.srcObject = stream;
  } catch(e) { showCam.value = false; alert("Erreur Caméra"); }
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
  // ENVOI : roomId, texte vide, photo remplie
  chatStore.sendMessage(currentRoomId.value, '', base64);
  stopCam();
}
</script>

<style scoped>
/* COPIE TON CSS PRÉCÉDENT ICI */
/* Je te remets l'essentiel pour que ça marche */
.chat-layout { display: flex; flex-direction: column; height: 100vh; background: #e5ddd5; font-family: sans-serif; }
.chat-header { height: 60px; background: #075e54; color: white; display: flex; align-items: center; padding: 0 10px; }
.messages-container { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.message-wrapper { display: flex; max-width: 80%; }
.my-msg { align-self: flex-end; flex-direction: row-reverse; }
.message-bubble { background: white; padding: 10px; border-radius: 8px; box-shadow: 0 1px 1px rgba(0,0,0,0.1); }
.my-msg .message-bubble { background: #dcf8c6; }
.msg-image { max-width: 100%; border-radius: 5px; margin-bottom: 5px; display: block; }
.input-area { background: #f0f0f0; padding: 10px; display: flex; gap: 10px; align-items: center; }
.msg-input { flex: 1; padding: 10px; border-radius: 20px; border: none; }
.btn-icon-action { background: none; border: none; font-size: 1.5rem; cursor: pointer; }
.cam-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 999; display: flex; flex-direction: column; }
.cam-video { flex: 1; object-fit: cover; }
.cam-controls { height: 100px; display: flex; justify-content: center; align-items: center; gap: 20px; background: rgba(0,0,0,0.5); }
.btn-snap { width: 70px; height: 70px; border-radius: 50%; background: white; border: 4px solid #ccc; }
.btn-cancel { color: white; background: none; border: none; }
</style>