<template>
  <div class="chat-container">
    <header class="chat-header">
      <button class="btn-back" @click="goBack">⬅</button>
      <div class="room-info">
        <h2>{{ currentRoomName }}</h2>
        <span class="status-dot"></span>
      </div>
      <div class="user-avatar-mini">
        <img :src="currentUserPhoto" alt="Moi" />
      </div>
    </header>

    <div class="messages-area" ref="messagesContainer">
      <div v-if="messages.length === 0" class="empty-state">
        👋 Soyez le premier à parler ici !
      </div>

      <div 
        v-for="msg in messages" 
        :key="msg.id" 
        class="message-bubble"
        :class="{ 'my-message': isMe(msg.author) }"
      >
        <div class="msg-header" v-if="!isMe(msg.author)">
          <span class="author-name">{{ msg.author }}</span>
        </div>

        <div v-if="msg.photo" class="msg-photo">
          <img :src="msg.photo" alt="Image envoyée" />
        </div>

        <p v-if="msg.text" class="msg-text">{{ msg.text }}</p>
        
        <span class="msg-date">{{ formatTime(msg.date) }}</span>
      </div>
    </div>

    <div class="input-area">
      <button class="btn-cam" @click="toggleCam">📸</button>
      
      <input 
        v-model="newMessage" 
        @keyup.enter="sendMessage"
        type="text" 
        placeholder="Écrivez un message..." 
      />
      
      <button class="btn-send" @click="sendMessage">➤</button>
    </div>

    <div v-if="showCam" class="cam-overlay">
      <video ref="videoEl" autoplay playsinline></video>
      <canvas ref="canvasEl" style="display:none"></canvas>
      <div class="cam-actions">
        <button class="btn-cancel" @click="stopCam">Annuler</button>
        <button class="btn-snap" @click="takePhoto"></button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

// 1. RÉCUPÉRATION DE L'ID DE LA ROOM DEPUIS L'URL
// Ex: si l'url est /room/sport, roomId = "sport"
const roomId = computed(() => (route.params.id as string) || 'general');

const newMessage = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

// --- GESTION CAMERA ---
const showCam = ref(false);
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;

// --- COMPUTED ---
const messages = computed(() => chatStore.messages[roomId.value] || []);
const currentUserPhoto = computed(() => chatStore.currentUser?.photo || 'https://via.placeholder.com/50');
const currentRoomName = computed(() => roomId.value.toUpperCase());

// --- LIFECYCLE ---
onMounted(() => {
  // SÉCURITÉ : Si l'utilisateur n'a pas de pseudo (refresh page), retour accueil
  if (!chatStore.currentUser) {
    router.push('/');
    return;
  }

  // IMPORTANT : On dit au serveur "Je rentre dans CETTE room là"
  chatStore.connectToServer(roomId.value);
  scrollToBottom();
});

onUpdated(() => {
  scrollToBottom();
});

// --- ACTIONS ---
function isMe(author: string) {
  return author === chatStore.currentUser?.username;
}

function formatTime(isoDate: string) {
  return new Date(isoDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function goBack() {
  router.push('/');
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// --- ENVOI DE MESSAGE ---
function sendMessage() {
  if (!newMessage.value.trim()) return;

  // C'EST ICI QUE TU AVAIS SÛREMENT LE PROBLÈME
  // On utilise bien "roomId.value" pour envoyer dans la room actuelle
  chatStore.sendMessage(roomId.value, newMessage.value);
  
  newMessage.value = ''; // On vide le champ
}

// --- LOGIQUE CAMERA (Identique à l'accueil) ---
async function toggleCam() {
  showCam.value = true;
  await nextTick();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    if(videoEl.value) videoEl.value.srcObject = stream;
  } catch(e) { console.error(e); showCam.value = false; }
}

function stopCam() {
  if(stream) stream.getTracks().forEach(t => t.stop());
  showCam.value = false;
}

function takePhoto() {
  if(!videoEl.value || !canvasEl.value) return;
  const vid = videoEl.value;
  const cvs = canvasEl.value;
  cvs.width = vid.videoWidth;
  cvs.height = vid.videoHeight;
  cvs.getContext('2d')?.drawImage(vid, 0, 0);
  
  // Envoi de la photo
  const photoBase64 = cvs.toDataURL('image/jpeg', 0.7);
  chatStore.sendMessage(roomId.value, '', photoBase64); // Texte vide, Photo remplie
  
  stopCam();
}

onBeforeUnmount(() => {
  stopCam();
});
</script>

<style scoped>
/* --- STYLE MINIMALISTE & MODERNE --- */
.chat-container {
  display: flex; flex-direction: column; height: 100vh; background: #f0f2f5;
}

.chat-header {
  background: white; padding: 15px; display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05); z-index: 10;
}
.room-info h2 { margin: 0; font-size: 1.2rem; }
.btn-back { border: none; background: none; font-size: 1.5rem; cursor: pointer; }
.user-avatar-mini img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #ddd; }

.messages-area {
  flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px;
}
.empty-state { text-align: center; color: #888; margin-top: 50px; }

.message-bubble {
  max-width: 75%; padding: 10px 15px; border-radius: 18px; position: relative; font-size: 0.95rem;
  background: white; align-self: flex-start; box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
.my-message {
  align-self: flex-end; background: #0084ff; color: white; border-bottom-right-radius: 4px;
}
.my-message .msg-date { color: rgba(255,255,255,0.8); }
.msg-photo img { max-width: 100%; border-radius: 10px; margin-top: 5px; }
.msg-date { font-size: 0.7rem; color: #999; display: block; text-align: right; margin-top: 5px; }
.author-name { font-size: 0.75rem; color: #666; font-weight: bold; margin-bottom: 4px; display: block; }

.input-area {
  background: white; padding: 10px; display: flex; gap: 10px; align-items: center;
  border-top: 1px solid #eee;
}
.input-area input {
  flex: 1; padding: 12px; border-radius: 20px; border: 1px solid #ddd; outline: none;
}
.btn-send, .btn-cam {
  background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #0084ff;
}

/* Cam Overlay */
.cam-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: black; z-index: 100;
  display: flex; flex-direction: column;
}
.cam-overlay video { width: 100%; flex: 1; object-fit: cover; }
.cam-actions {
  height: 100px; display: flex; justify-content: center; align-items: center; gap: 20px;
  position: absolute; bottom: 20px; width: 100%;
}
.btn-snap {
  width: 70px; height: 70px; border-radius: 50%; background: white; border: 4px solid #ddd;
}
.btn-cancel {
  position: absolute; left: 20px; color: white; background: none; border: none; font-size: 1.2rem;
}
</style>