<template>  <div class="page container">
    <h1>{{ roomLabel }}</h1>

    <div class="chat-box" ref="chatBox">
      <div v-if="messages.length === 0" class="empty">Aucun message pour le moment.</div>
      <div v-for="m in messages" :key="m.id" :class="['message', { self: m.author === user?.name }]">
        <template v-if="m.photoData">
          <img :src="m.photoData" class="msg-photo" />
          <div v-if="m.text" class="msg-text">{{ m.text }}</div>
        </template>
        <template v-else>
          <div class="msg-meta"><strong>{{ m.author }}</strong> <small>{{ formatTime(m.timestamp) }}</small></div>
          <div class="msg-text">{{ m.text }}</div>
        </template>
      </div>
    </div>

    <form @submit.prevent="sendMessage" class="form-row">
      <input v-model="textInput" type="text" placeholder="Écrivez un message..." />
      <input ref="fileInput" type="file" accept="image/*" capture="environment" @change="onFileChange" />
      <button class="btn" type="submit">Envoyer</button>
    </form>

    <div style="margin-top:1rem;">
      <button class="btn" @click="goGallery">Voir la galerie 📸</button>
      <button class="btn" style="background:#e33" @click="clearRoom">Tout effacer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';

type Msg = {
  id: string;
  author: string;
  text: string | null;
  timestamp: string;
  avatar: string | null;
  photoData: string | null;
};

const router = useRouter();
const user = ref<{ name: string; avatar: string | null; room: string | null } | null>(null);

const textInput = ref('');
const messages = ref<Msg[]>([]);
const chatBox = ref<HTMLElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

let room = 'general';
const roomLabel = ref('# Général');

function loadUser() {
  if (process.client) {
    const raw = localStorage.getItem('chat_user');
    user.value = raw ? JSON.parse(raw) : { name: 'Invité', avatar: null, room: 'general' };
    room = user.value?.room || 'general';
    roomLabel.value = '# ' + (room === 'general' ? 'Général' : room);
  }
}

function storageKey() { return `chat_messages_${room}`; }

function loadMessages() {
  const raw = localStorage.getItem(storageKey());
  messages.value = raw ? JSON.parse(raw) : [];
  // keep chronological order
  messages.value.sort((a,b) => a.timestamp.localeCompare(b.timestamp));
  scrollBottom();
}

function saveMessages() {
  localStorage.setItem(storageKey(), JSON.stringify(messages.value));
}

function appendMessage(m: Msg) {
  messages.value.push(m);
  saveMessages();
  scrollBottom();
}

function sendMessage() {
  const t = textInput.value.trim();
  let photoData: string | null = null;
  // if fileInput has file, we handled in onFileChange which pushes immediately
  if (!t && !pendingFile.value) return;

  if (pendingFile.value) {
    photoData = pendingFile.value;
    pendingFile.value = null;
  }

  const m: Msg = {
    id: crypto.randomUUID(),
    author: user.value?.name || 'Invité',
    text: t || null,
    timestamp: new Date().toISOString(),
    avatar: user.value?.avatar || null,
    photoData
  };
  appendMessage(m);

  if (photoData) {
    // also add to gallery
    const gal = JSON.parse(localStorage.getItem('gallery_photos') || '[]');
    gal.unshift(photoData);
    localStorage.setItem('gallery_photos', JSON.stringify(gal));
    notify('Photo ajoutée', 'Votre photo a été enregistrée dans la galerie.');
  }

  textInput.value = '';
}

const pendingFile = ref<string | null>(null);

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const r = new FileReader();
  r.onload = () => {
    pendingFile.value = r.result as string;
    // optionally auto-send when image picked:
    sendMessage();
    if (fileInput.value) fileInput.value.value = '';
  };
  r.readAsDataURL(file);
}

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function scrollBottom() {
  if (chatBox.value) {
    // nextTick not required; setTimeout small helps ensure DOM update
    setTimeout(() => chatBox.value!.scrollTop = chatBox.value!.scrollHeight, 50);
  }
}

function goGallery() { router.push('/gallery'); }

function clearRoom() {
  if (!confirm('Effacer l\'historique de cette room ?')) return;
  localStorage.removeItem(storageKey());
  localStorage.removeItem('gallery_photos');
  messages.value = [];
}

async function notify(title: string, body?: string) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  } else if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    if (p === 'granted') new Notification(title, { body });
  }
}

onMounted(() => {
  loadUser();
  loadMessages();
});

onBeforeUnmount(() => {
  // nothing specific
});
</script>
