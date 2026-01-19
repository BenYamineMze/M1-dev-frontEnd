<template>
  <div class="page-container">
    <div class="header">
      <h1>Bienvenue 👋</h1>
      <p class="subtitle">Configurez votre profil pour rejoindre le chat.</p>
    </div>

    <div class="card">
      <div class="form-group">
        <label>Votre Pseudo</label>
        <input 
          v-model="pseudo" 
          type="text" 
          placeholder="Ex: CyberPunk2077" 
          class="input-modern"
        />
      </div>

      <div class="camera-wrapper">
        <div class="viewfinder" :class="{ 'flash-anim': isFlashing }">
          <video 
            ref="videoEl" 
            autoplay 
            playsinline 
            v-show="showVideo" 
            class="video-feed" 
          />
          
          <img 
            v-if="avatar" 
            :src="avatar" 
            class="photo-preview" 
            alt="Votre avatar" 
          />
          
          <canvas ref="canvasEl" style="display:none" />

          <div v-if="!cameraActive && !avatar" class="placeholder-cam">
            <span>📷 Caméra éteinte</span>
          </div>
        </div>

        <div class="cam-controls">
          <button v-if="!cameraActive && !avatar" class="btn-icon primary" @click="startCamera">
            <span class="icon">🔌</span> Activer
          </button>
          
          <button v-if="cameraActive" class="btn-round capture-btn" @click="takePhoto"></button>
          
          <button v-if="avatar" class="btn-text" @click="retake">
            🔄 Reprendre une photo
          </button>
        </div>
      </div>
    </div>

    <div class="rooms-section">
      <h3>Choisir un salon</h3>
      <div class="rooms-grid">
        <div
          v-for="r in rooms"
          :key="r.id"
          class="room-card"
          :class="{ active: selectedRoom === r.id }"
          @click="selectedRoom = r.id"
        >
          <span class="room-icon">{{ getRoomIcon(r.id) }}</span>
          <span class="room-name">{{ r.label }}</span>
        </div>
      </div>
    </div>

    <div class="fixed-bottom">
      <button class="btn-main" @click="login" :disabled="!isFormValid">
        Rejoindre le Chat 🚀
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';
import { useChatStore } from '~/stores/chat'; // Import du store

const router = useRouter();
const chatStore = useChatStore();

// --- ETAT ---
const pseudo = ref('');
const avatar = ref<string | null>(null);
const selectedRoom = ref<string>('general');
const isFlashing = ref(false); // Pour l'effet flash photo

// Données statiques (tu pourrais les récupérer du serveur via socket aussi)
const rooms = [
  { id: 'general', label: 'Général' },
  { id: 'tech', label: 'Tech' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'random', label: 'Random' }
];

// --- CAMERA ---
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;
const cameraActive = ref(false);
const showVideo = ref(false);

const isFormValid = computed(() => {
  return pseudo.value.trim().length > 0 && avatar.value !== null && selectedRoom.value;
});

function getRoomIcon(id: string) {
  const icons: Record<string, string> = { 
    general: '💬', tech: '💻', gaming: '🎮', random: '🎲' 
  };
  return icons[id] || '#';
}

async function startCamera() {
  if (!import.meta.client) return;
  
  // Reset avatar si on redémarre
  avatar.value = null;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, 
      audio: false 
    });
    
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      videoEl.value.onloadedmetadata = () => {
        if(videoEl.value) videoEl.value.play();
      };
    }
    cameraActive.value = true;
    showVideo.value = true;
  } catch (err) {
    console.error(err);
    alert("Impossible d'accéder à la caméra (Vérifiez HTTPS ou permissions)");
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
  if (!videoEl.value || !canvasEl.value) return;

  // Effet Flash
  isFlashing.value = true;
  setTimeout(() => isFlashing.value = false, 200);

  // Capture
  const video = videoEl.value;
  const canvas = canvasEl.value;
  
  // On s'assure de garder un ratio carré ou celui de la vidéo
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Effet miroir pour que ce soit naturel pour l'user
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  avatar.value = canvas.toDataURL('image/jpeg', 0.8);
  stopCamera();

  // Notification (Hardware API)
  if (Notification.permission === 'granted') {
     new Notification('📸 Photo de profil enregistrée !');
  } else if (Notification.permission !== 'denied') {
     Notification.requestPermission();
  }
}

function retake() {
  avatar.value = null;
  startCamera();
}

function login() {
  if (!isFormValid.value) return;

  // 1. Sauvegarde dans le Store (Pinia)
  chatStore.setUser(pseudo.value, avatar.value!);
  
  // 2. Initialisation connexion Socket (via le store)
  chatStore.init();

  // 3. Navigation
  router.push('/room'); 
  // Ou router.push(`/room/${selectedRoom.value}`); si tu gères les pages dynamiques
}

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
/* --- VARIABLES --- */
.page-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 20px 100px 20px; /* Padding bottom pour le bouton fixe */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #333;
}

/* --- HEADER --- */
.header {
  text-align: center;
  margin-bottom: 2rem;
}
.header h1 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  color: #111;
}
.subtitle {
  color: #666;
  font-size: 0.95rem;
}

/* --- CARTE GENERALE --- */
.card {
  background: white;
  border-radius: 20px;
  padding: 1.5rem;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

/* --- INPUT --- */
.form-group {
  margin-bottom: 1.5rem;
}
.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #444;
}
.input-modern {
  width: 100%;
  padding: 12px 15px;
  border: 2px solid #eee;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s;
  background: #f9f9f9;
}
.input-modern:focus {
  border-color: #2563eb;
  background: white;
  outline: none;
}

/* --- CAMERA --- */
.camera-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.viewfinder {
  width: 100%;
  max-width: 280px;
  aspect-ratio: 1/1; /* Carré parfait */
  background: #000;
  border-radius: 50%; /* Cercle style photo de profil */
  overflow: hidden;
  position: relative;
  border: 4px solid #fff;
  box-shadow: 0 0 0 4px #eee;
}

.video-feed, .photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* Effet miroir */
}

.placeholder-cam {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  background: #eee;
}

/* Animation Flash */
.flash-anim {
  animation: flash 0.3s;
}
@keyframes flash {
  0% { opacity: 1; }
  50% { opacity: 0; background: white; }
  100% { opacity: 1; }
}

/* --- CONTROLS --- */
.cam-controls {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon {
  background: #eee;
  border: none;
  padding: 10px 20px;
  border-radius: 30px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.capture-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 4px solid white;
  background: #ff4757;
  box-shadow: 0 0 0 2px #ff4757;
  cursor: pointer;
  transition: transform 0.1s;
}
.capture-btn:active { transform: scale(0.9); }

.btn-text {
  background: none;
  border: none;
  color: #2563eb;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

/* --- ROOMS --- */
.rooms-section h3 {
  font-size: 1.1rem;
  margin-bottom: 1rem;
  color: #444;
}

.rooms-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.room-card {
  background: white;
  border: 2px solid #eee;
  border-radius: 12px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.room-card.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}

.room-icon { font-size: 1.2rem; }
.room-name { font-weight: 600; }

/* --- FIXED BUTTON --- */
.fixed-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 20px;
  background: linear-gradient(to top, white 80%, transparent);
  text-align: center;
  z-index: 10;
}

.btn-main {
  width: 100%;
  max-width: 500px;
  background: #2563eb;
  color: white;
  border: none;
  padding: 16px;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 16px;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4);
  transition: transform 0.2s, background 0.2s;
}

.btn-main:disabled {
  background: #ccc;
  box-shadow: none;
  cursor: not-allowed;
}
.btn-main:active:not(:disabled) {
  transform: scale(0.98);
}
</style>