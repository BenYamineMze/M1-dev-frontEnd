<template>
  <div class="page-container">
    <div class="header">
      <h1>Bienvenue 👋</h1>
      <p class="subtitle">Configurez votre profil pour rejoindre le chat.Ben</p>
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
      
      <div v-if="loading" class="loading-text">
        ⏳ Récupération des salons...
      </div>

      <div v-else class="rooms-grid">
        <div
          v-for="r in chatStore.rooms"
          :key="r.id"
          class="room-card"
          :class="{ active: selectedRoom === r.id }"
          @click="selectedRoom = r.id"
        >
          <span class="room-icon">{{ getRoomIcon(r.name) }}</span>
          <span class="room-name">{{ r.name }}</span>
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

const router = useRouter();
const chatStore = useChatStore();

// --- ETAT ---
const pseudo = ref('');
const avatar = ref<string | null>(null);
const selectedRoom = ref<string>(''); // Vide par défaut
const isFlashing = ref(false);
const loading = ref(true); // Pour savoir si on attend l'API

// --- CAMERA VARS ---
const videoEl = ref<HTMLVideoElement | null>(null);
const canvasEl = ref<HTMLCanvasElement | null>(null);
let stream: MediaStream | null = null;
const cameraActive = ref(false);
const showVideo = ref(false);

// --- INITIALISATION ---
onMounted(async () => {
  // 1. On lance la récupération API via le Store
  await chatStore.fetchRooms();
  loading.value = false;

  // 2. Sélection par défaut (la première room de la liste)
  if (chatStore.rooms.length > 0) {
    selectedRoom.value = chatStore.rooms[0].id;
  }

  // 3. Restaurer le pseudo si déjà là
  if (chatStore.currentUser?.username) {
    pseudo.value = chatStore.currentUser.username;
  }
});

const isFormValid = computed(() => {
  return pseudo.value.trim().length > 0 && avatar.value !== null && selectedRoom.value;
});

// Petite fonction pour donner des icônes selon le nom du salon
function getRoomIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('general')) return '💬';
  if (lowerName.includes('tech') || lowerName.includes('dev')) return '💻';
  if (lowerName.includes('game') || lowerName.includes('jeu')) return '🎮';
  if (lowerName.includes('music')) return '🎵';
  if (lowerName.includes('sport')) return '⚽';
  return '📢'; // Icône par défaut
}

// --- LOGIQUE CAMERA (Ton code original) ---
async function startCamera() {
  if (!import.meta.client) return;
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
    alert("Impossible d'accéder à la caméra");
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
  isFlashing.value = true;
  setTimeout(() => isFlashing.value = false, 200);

  const video = videoEl.value;
  const canvas = canvasEl.value;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  avatar.value = canvas.toDataURL('image/jpeg', 0.8);
  stopCamera();
}

function retake() {
  avatar.value = null;
  startCamera();
}

// --- LOGIN ---
function login() {
  if (!isFormValid.value) return;

  // 1. Sauvegarde Store
  chatStore.setUser(pseudo.value, avatar.value!);
  
  // 2. Connexion Spécifique à la Room choisie
  chatStore.connectToServer(selectedRoom.value);

  // 3. Navigation dynamique
  router.push(`/room/${selectedRoom.value}`);
}

onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
/* --- TON CSS ORIGINAL (INCHANGÉ) --- */
.page-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 20px 100px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #333;
}

.header { text-align: center; margin-bottom: 2rem; }
.header h1 { font-size: 1.8rem; margin-bottom: 0.5rem; color: #111; }
.subtitle { color: #666; font-size: 0.95rem; }

.card {
  background: white; border-radius: 20px; padding: 1.5rem;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); margin-bottom: 2rem;
}

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.9rem; color: #444; }
.input-modern {
  width: 100%; padding: 12px 15px; border: 2px solid #eee; border-radius: 12px;
  font-size: 1rem; transition: all 0.3s; background: #f9f9f9; box-sizing: border-box;
}
.input-modern:focus { border-color: #2563eb; background: white; outline: none; }

.camera-wrapper { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.viewfinder {
  width: 100%; max-width: 280px; aspect-ratio: 1/1; background: #000;
  border-radius: 50%; overflow: hidden; position: relative;
  border: 4px solid #fff; box-shadow: 0 0 0 4px #eee;
}
.video-feed, .photo-preview { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.placeholder-cam { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #666; background: #eee; }

.flash-anim { animation: flash 0.3s; }
@keyframes flash {
  0% { opacity: 1; } 50% { opacity: 0; background: white; } 100% { opacity: 1; }
}

.cam-controls { height: 60px; display: flex; align-items: center; justify-content: center; }
.btn-icon { background: #eee; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.capture-btn { width: 60px; height: 60px; border-radius: 50%; border: 4px solid white; background: #ff4757; box-shadow: 0 0 0 2px #ff4757; cursor: pointer; transition: transform 0.1s; }
.capture-btn:active { transform: scale(0.9); }
.btn-text { background: none; border: none; color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: underline; }

.rooms-section h3 { font-size: 1.1rem; margin-bottom: 1rem; color: #444; }
.rooms-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.room-card {
  background: white; border: 2px solid #eee; border-radius: 12px; padding: 15px;
  display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s;
}
.room-card.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }
.room-icon { font-size: 1.2rem; }
.room-name { font-weight: 600; text-transform: capitalize; }

.loading-text { text-align: center; color: #888; padding: 20px; font-style: italic; }

.fixed-bottom {
  position: fixed; bottom: 0; left: 0; width: 100%; padding: 20px;
  background: linear-gradient(to top, white 80%, transparent); text-align: center; z-index: 10;
  box-sizing: border-box; /* Important pour éviter le dépassement */
}
.btn-main {
  width: 100%; max-width: 500px; background: #2563eb; color: white; border: none;
  padding: 16px; font-size: 1.1rem; font-weight: bold; border-radius: 16px; cursor: pointer;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.4); transition: transform 0.2s, background 0.2s;
}
.btn-main:disabled { background: #ccc; box-shadow: none; cursor: not-allowed; }
.btn-main:active:not(:disabled) { transform: scale(0.98); }
</style>