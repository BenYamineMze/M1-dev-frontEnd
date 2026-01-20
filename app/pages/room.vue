<template>
  <div class="chat-layout">
    
    <header class="chat-header">
      <button class="btn-icon" @click="leaveRoom">⬅️</button>
      
      <div class="room-info">
        <h2># {{ currentRoomId }}</h2>
        <span class="status-dot"></span> <small>En ligne</small>
      </div>

      <div class="header-actions">
        <button class="btn-icon" @click="goToGallery">🖼️</button>
      </div>
    </header>

    <div class="messages-container" ref="scrollContainer">
      <div v-if="roomMessages.length === 0" class="empty-state">
        <p>👋 C'est le début de la discussion dans <strong>{{ currentRoomId }}</strong>.</p>
      </div>

      <template v-for="msg in roomMessages" :key="msg.id">
        
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

      </template>
    </div>

    <form class="input-area" @submit.prevent="handleSend">
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*" 
        capture="environment" 
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
import { useRoute, useRouter } from '#app'; // Imports Nuxt
import { useChatStore } from '~/stores/chat';

const route = useRoute();
const router = useRouter();
const chatStore = useChatStore();

const scrollContainer = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const textInput = ref('');
const pendingImage = ref<string | null>(null);

// 1. Récupération dynamique de la room (ex: /room/sport -> sport)
// Si l'URL est juste /room/, on met 'general' par défaut
const currentRoomId = computed(() => (route.params.id as string) || 'general');

// 2. Récupération des messages
const roomMessages = computed(() => {
  return chatStore.messages[currentRoomId.value] || [];
});

// --- HELPER FUNCTIONS ---

function isMe(authorName: string) {
  return authorName === chatStore.currentUser?.username;
}

function formatTime(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function scrollBottom() {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
    }
  });
}

// Scroll auto quand un message arrive
watch(roomMessages, () => {
  scrollBottom();
}, { deep: true });

// --- ACTIONS ---

function leaveRoom() {
  router.push('/reception');
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
      pendingImage.value = evt.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function handleSend() {
  if (!textInput.value.trim() && !pendingImage.value) return;

  chatStore.sendMessage(
    currentRoomId.value, 
    textInput.value, 
    pendingImage.value
  );

  textInput.value = '';
  pendingImage.value = null;
  scrollBottom();
}

function openImage(src: string) {
  // Optionnel : Ouvrir en grand
  console.log("Zoom image");
}

onMounted(() => {
  chatStore.init();
  scrollBottom();
});
</script>

<style scoped>
/* --- STYLES IDENTIQUES AVEC AJOUT DU SYSTEM-MSG --- */

.chat-layout {
  display: flex; flex-direction: column; height: 100vh;
  background-color: #e5ddd5; font-family: sans-serif;
}

.chat-header {
  height: 60px; background: #075e54; color: white;
  display: flex; align-items: center; padding: 0 10px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
}

.room-info { flex-grow: 1; margin-left: 15px; }
.room-info h2 { margin: 0; font-size: 1.1rem; }
.btn-icon { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: white; }

.messages-container {
  flex-grow: 1; overflow-y: auto; padding: 15px;
  display: flex; flex-direction: column; gap: 5px;
  /* Fond style WhatsApp */
  background-image: linear-gradient(#e5ddd5 2px, transparent 2px),
  linear-gradient(90deg, #e5ddd5 2px, transparent 2px),
  linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position:-2px -2px, -2px -2px, -1px -1px, -1px -1px;
}

/* --- NOUVEAU STYLE POUR MESSAGES SYSTÈME --- */
.system-message {
  text-align: center;
  font-size: 0.75rem;
  color: #555;
  background-color: rgba(255,255,255,0.6);
  padding: 4px 10px;
  border-radius: 10px;
  align-self: center;
  margin: 5px 0;
  box-shadow: 0 1px 1px rgba(0,0,0,0.05);
}

.message-wrapper {
  display: flex; max-width: 80%; margin-bottom: 2px;
}
.message-wrapper.my-msg {
  align-self: flex-end; flex-direction: row-reverse;
}

.message-bubble {
  background: white; padding: 8px 10px; border-radius: 8px;
  box-shadow: 0 1px 1px rgba(0,0,0,0.1);
}
.my-msg .message-bubble { background: #dcf8c6; }

.avatar-mini {
  width: 30px; height: 30px; background: #ccc; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin: 0 8px; font-weight: bold; color: #555; font-size: 0.8rem;
}

.author-name {
  font-size: 0.75rem; font-weight: bold; color: #d35400; margin-bottom: 4px;
}
.msg-image {
  max-width: 100%; border-radius: 6px; margin-bottom: 5px; display: block;
}
.timestamp {
  display: block; font-size: 0.65rem; text-align: right; color: #999;
}

.input-area {
  background: #f0f0f0; padding: 8px; display: flex; gap: 10px; align-items: center;
}
.msg-input {
  flex-grow: 1; padding: 10px; border-radius: 20px; border: 1px solid #ccc; outline: none;
}
.btn-send {
  background: #075e54; color: white; border: none;
  width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
}
.btn-send:disabled { background: #ccc; }

.image-preview-overlay {
  position: fixed; top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.8); z-index: 100;
  display: flex; align-items: center; justify-content: center;
}
.preview-card {
  background: white; padding: 15px; border-radius: 10px; text-align: center; max-width: 90%;
}
.preview-card img { max-width: 100%; max-height: 50vh; margin-bottom: 10px; border-radius: 5px;}
.preview-actions { display: flex; justify-content: space-around; gap: 10px;}
.preview-actions button { padding: 8px 20px; border:none; border-radius: 5px; cursor: pointer;}
.confirm { background: #075e54; color: white; }

/* Casse les mots trop longs (ex: "Hahahahaha....") */
.message-bubble p {
  word-wrap: break-word; 
  word-break: break-word; 
  white-space: pre-wrap;
  max-width: 100%;
  margin: 0;
}

/* Force les images à ne jamais dépasser la largeur de la bulle */
.msg-image {
  max-width: 100%;       /* Ne dépasse jamais le conteneur */
  height: auto;          /* Garde le ratio */
  object-fit: contain;   
  display: block;
  border-radius: 8px;
}

/* Assure que le conteneur scroll bien */
.messages-container {
  overflow-x: hidden; /* Empêche le scroll horizontal moche */
}
</style>