<template>
  <div class="chat-layout">
    
    <header class="chat-header">
      <button class="btn-icon" @click="leaveRoom">⬅️</button>
      
      <div class="room-info">
        <h2>{{ currentRoomName }}</h2>
        <span class="status-dot"></span> <small>En ligne</small>
      </div>

      <div class="header-actions">
        <a href="tel:0600000000" class="btn-icon phone-btn">📞</a>
        <button class="btn-icon" @click="goToGallery">🖼️</button>
      </div>
    </header>

    <div class="messages-container" ref="scrollContainer">
      <div v-if="roomMessages.length === 0" class="empty-state">
        <p>👋 C'est calme ici... Dites bonjour !</p>
      </div>

      <div 
        v-for="(msg, index) in roomMessages" 
        :key="index"
        class="message-wrapper"
        :class="{ 'my-msg': isMe(msg.author) }"
      >
        <div v-if="!isMe(msg.author)" class="avatar-mini">
           {{ msg.author.charAt(0).toUpperCase() }}
        </div>

        <div class="message-bubble">
          <div v-if="!isMe(msg.author)" class="author-name">{{ msg.author }}</div>

          <img 
            v-if="msg.photo" 
            :src="msg.photo" 
            class="msg-image" 
            @click="openImage(msg.photo)"
          />

          <p v-if="msg.text">{{ msg.text }}</p>

          <span class="timestamp">{{ formatTime(msg.date) }}</span>
        </div>
      </div>
    </div>

    <form class="input-area" @submit.prevent="handleSend">
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*" 
        style="display:none" 
        @change="handleFileSelect"
      />

      <button type="button" class="btn-attach" @click="triggerFile">
        📷
      </button>

      <input 
        v-model="textInput" 
        type="text" 
        placeholder="Message..." 
        class="msg-input"
      />

      <button type="submit" class="btn-send" :disabled="!textInput && !pendingImage">
        ➤
      </button>
    </form>

    <div v-if="pendingImage" class="image-preview-overlay">
      <div class="preview-card">
        <img :src="pendingImage" />
        <div class="preview-actions">
          <button @click="pendingImage = null">Annuler</button>
          <button @click="handleSend" class="confirm">Envoyer</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

const router = useRouter();
const chatStore = useChatStore();
const scrollContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// État local
const textInput = ref('');
const pendingImage = ref<string | null>(null);

// On récupère la room active depuis le store (ou par défaut 'general')
// Note: Idéalement, stocke 'currentRoomId' dans le store lors du login
const currentRoomId = 'general'; 
// Astuce: Si tu as géré le localStorage "chat_user" dans la page précédente, 
// tu devrais plutôt le lire depuis le store ici.

const currentRoomName = computed(() => {
  const room = chatStore.rooms.find(r => r.id === currentRoomId);
  return room ? room.name : 'Général';
});

const roomMessages = computed(() => {
  return chatStore.messages[currentRoomId] || [];
});

// --- HELPERS ---

function isMe(authorName: string) {
  return authorName === chatStore.currentUser?.username;
}

function formatTime(isoString?: string) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

// Scroll automatique quand un nouveau message arrive
watch(roomMessages, () => {
  scrollBottom();
}, { deep: true });

// --- ACTIONS ---

function leaveRoom() {
  router.push('/');
}

function goToGallery() {
  router.push('/gallery');
}

function triggerFile() {
  fileInput.value?.click();
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      // On affiche la preview au lieu d'envoyer direct
      pendingImage.value = evt.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function handleSend() {
  if (!textInput.value.trim() && !pendingImage.value) return;

  // Envoi via le Store (qui gère Socket + LocalStorage + Vibration)
  chatStore.sendMessage(
    currentRoomId, 
    textInput.value, 
    pendingImage.value // null si pas d'image
  );

  // Reset
  textInput.value = '';
  pendingImage.value = null;
  scrollBottom();
}

function openImage(src: string) {
  // Bonus: Tu pourrais ouvrir une modale ici
  console.log("Ouvrir image full screen", src);
}

onMounted(() => {
  // Charge les données si on refresh la page
  chatStore.init(); 
  scrollBottom();
});
</script>

<style scoped>
/* --- LAYOUT GLOBAL --- */
.chat-layout {
  display: flex;
  flex-direction: column;
  height: 100vh; /* Prend tout l'écran */
  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* --- HEADER --- */
.chat-header {
  flex-shrink: 0;
  height: 60px;
  background: white;
  display: flex;
  align-items: center;
  padding: 0 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  z-index: 10;
}

.room-info {
  flex-grow: 1;
  margin-left: 10px;
}
.room-info h2 {
  margin: 0;
  font-size: 1rem;
  color: #333;
}
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: #2ecc71;
  border-radius: 50%;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  padding: 8px;
  cursor: pointer;
  border-radius: 50%;
}
.btn-icon:hover { background-color: #f0f0f0; }
.phone-btn { margin-right: 5px; }

/* --- MESSAGES --- */
.messages-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scroll-behavior: smooth;
}

.empty-state {
  text-align: center;
  color: #888;
  margin-top: 50px;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  max-width: 80%;
  margin-bottom: 5px;
}

/* Message des AUTRES (Aligné gauche, gris) */
.message-wrapper {
  align-self: flex-start;
}
.message-bubble {
  background: white;
  padding: 8px 12px;
  border-radius: 12px 12px 12px 2px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  position: relative;
}
.avatar-mini {
  width: 28px;
  height: 28px;
  background: #ddd;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
  margin-right: 8px;
  flex-shrink: 0;
}

/* Message de MOI (Aligné droite, bleu) */
.message-wrapper.my-msg {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.message-wrapper.my-msg .message-bubble {
  background: #2563eb; /* Bleu Messenger */
  color: white;
  border-radius: 12px 12px 2px 12px;
}
.message-wrapper.my-msg .author-name {
  display: none; /* Pas besoin de mon nom */
}
.message-wrapper.my-msg .timestamp {
  color: rgba(255,255,255,0.7);
}

/* Contenu des messages */
.author-name {
  font-size: 0.75rem;
  font-weight: bold;
  color: #e58e26;
  margin-bottom: 2px;
}
.msg-image {
  max-width: 100%;
  border-radius: 8px;
  margin-bottom: 5px;
  display: block;
}
.timestamp {
  display: block;
  font-size: 0.65rem;
  text-align: right;
  margin-top: 4px;
  color: #999;
}

/* --- INPUT BAR --- */
.input-area {
  flex-shrink: 0;
  background: white;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid #eee;
}

.msg-input {
  flex-grow: 1;
  padding: 10px 15px;
  border-radius: 20px;
  border: 1px solid #ddd;
  outline: none;
  font-size: 1rem;
}
.msg-input:focus { border-color: #2563eb; }

.btn-attach {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  padding: 5px;
}

.btn-send {
  background: #2563eb;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  cursor: pointer;
  transition: transform 0.2s;
}
.btn-send:disabled {
  background: #ccc;
  cursor: default;
}
.btn-send:active:not(:disabled) {
  transform: scale(0.9);
}

/* --- PREVIEW OVERLAY --- */
.image-preview-overlay {
  position: fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.8);
  z-index: 100;
  display:flex;
  align-items:center;
  justify-content:center;
}
.preview-card {
  background: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 90%;
  text-align: center;
}
.preview-card img {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 8px;
  margin-bottom: 10px;
}
.preview-actions {
  display: flex;
  justify-content: space-between;
}
.preview-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.confirm {
  background: #2563eb;
  color: white;
}
</style>