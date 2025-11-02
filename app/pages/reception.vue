<template>
<div class="page container">
    <h1>Connexion</h1>

    <input v-model="pseudo" type="text" placeholder="Entrez votre pseudo" />

    <div class="camera-wrap">
      <video ref="videoEl" autoplay playsinline v-show="showVideo" class="camera" />
      <img v-if="avatar" :src="avatar" class="preview" alt="avatar preview" />
      <canvas ref="canvasEl" style="display:none" />
    </div>

    <div class="controls">
      <button class="btn" @click="startCamera" :disabled="cameraActive">Démarrer caméra</button>
      <button class="btn" @click="takePhoto" :disabled="!cameraActive">📸 Prendre photo</button>
      <button v-if="avatar" class="btn danger" @click="retake">🔁 Reprendre</button>
    </div>

    <h2 style="margin-top:1rem;">Choisissez une room</h2>

    <div class="rooms">
      <div
        v-for="r in rooms"
        :key="r.id"
        :class="['room-item', {active: selectedRoom === r.id}]"
        @click="selectedRoom = r.id"
      >
        # {{ r.label }}
      </div>
    </div>

    <button class="btn big" @click="login">Entrer dans la room</button>
  </div>
</template>


<script setup lang="ts">

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';

const pseudo = ref('');
const avatar = ref<string | null>(null);
const selectedRoom = ref<string>('general');

const rooms = [
  { id: 'general', label: 'Général' },
  { id: 'sport', label: 'Sport' },
  { id: 'music', label: 'Musique' },
  { id: 'school', label: 'École' }
];

const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;
const cameraActive = ref(false);
const showVideo = ref(true);

const router = useRouter();

function isClient() { return process.client; }

async function startCamera() {
  if (!isClient()) return;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    if (videoEl.value) videoEl.value.srcObject = stream;
    cameraActive.value = true;
    showVideo.value = true;
  } catch (err) {
    alert("Caméra non accessible");
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  cameraActive.value = false;
  showVideo.value = false;
}

function takePhoto() {
  if (!isClient()) return;
  const video = videoEl.value;
  const canvas = canvasEl.value;
  if (!video || !canvas) return;

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  avatar.value = canvas.toDataURL('image/jpeg', 0.75);

  stopCamera();

  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Photo enregistrée 📸');
    } else {
      Notification.requestPermission();
    }
  }
}

function retake() {
  avatar.value = null;
  startCamera();
}

function login() {
  if (!pseudo.value.trim()) {
    alert('Pseudo requis');
    return;
  }
  if (!avatar.value) {
    alert('Prenez une photo d\'abord !');
    return;
  }
  if (!selectedRoom.value) {
    alert('Choisissez une room');
    return;
  }

  localStorage.setItem('chat_user', JSON.stringify({
    name: pseudo.value,
    avatar: avatar.value,
    room: selectedRoom.value
  }));

  router.push('/room');
}

onBeforeUnmount(stopCamera);
</script>

<style scoped>


.camera {
  width: 100%;
  border-radius: 12px;
  margin-top: 1rem;
}

.preview {
  width: 100%;
  border-radius: 12px;
  margin-top: 1rem;
}



.container { max-width:480px; margin:40px auto; text-align:center; }
.camera { width:100%; border-radius:12px; background:#000; }
.preview { width:100%; border-radius:12px; object-fit:cover; }

.controls { display:flex; gap:.5rem; justify-content:center; margin-top:.6rem; flex-wrap:wrap; }

input[type="text"]{
  width:100%;
  padding:.6rem;
  border-radius:8px;
  margin-bottom:.8rem;
  border:1px solid #ddd;
}

.rooms {
  display:flex;
  gap:.6rem;
  flex-wrap:wrap;
  justify-content:center;
  margin:1rem 0;
}

.room-item {
  background:#eee;
  padding:.6rem 1rem;
  border-radius:10px;
  cursor:pointer;
  transition:.2s;
  border:2px solid transparent;
}
.room-item:hover { background:#ddd; }
.room-item.active {
  background:#007bff;
  color:#fff;
  border-color:#005dc1;
}

.btn {
  background:#007bff;
  color:#fff;
  padding:.6rem 1rem;
  border-radius:8px;
  border:none;
  cursor:pointer;
}
.btn.big {
  margin-top:1.2rem;
  width:100%;
}
.btn.danger {
  background:#dc3545;
}
</style>