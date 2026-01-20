<template>
  <div class="page-wrapper">
    <div class="page-container">
      
      <div class="header">
        <h1>KARIBU 👋</h1>
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

        <div class="hardware-row">
          <div v-if="battery" class="hw-pill" :class="{ 'charging': battery.charging }">
            <span class="icon">{{ battery.charging ? '⚡' : '🔋' }}</span>
            <span>{{ (battery.level * 100).toFixed(0) }}%</span>
          </div>

          <div class="hw-pill clickable" @click="getGeo" :class="{ 'active': coords }">
            <span class="icon">📍</span>
            <span v-if="coords">{{ coords.latitude.toFixed(2) }}, {{ coords.longitude.toFixed(2) }}</span>
            <span v-else>Me localiser</span>
          </div>
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
          ⏳ Chargement des salons...
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

      <div class="action-area">
        <button class="btn-main" @click="login" :disabled="!isFormValid">
          Rejoindre le Chat 🚀
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- IMPORTS ---
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from '#app';
import { useChatStore } from '~/stores/chat'; // On importe notre cerveau (Pinia)

// --- INITIALISATION ---
const router = useRouter();       // Pour changer de page
const chatStore = useChatStore(); // Pour accéder aux données globales

// --- VARIABLES RÉACTIVES (STATE) ---
// Si ces variables changent, l'écran se met à jour automatiquement
const pseudo = ref('');
const avatar = ref<string | null>(null); // Contiendra l'image en Base64
const selectedRoom = ref<string>(''); 
const isFlashing = ref(false); // Pour l'animation du flash
const loading = ref(true); // État de chargement des rooms

// --- VARIABLES HARDWARE ---
const battery = ref<any>(null);
const coords = ref<GeolocationCoordinates | null>(null);

// --- VARIABLES TECHNIQUES CAMÉRA ---
const videoEl = ref<HTMLVideoElement | null>(null);   // Lien vers <video>
const canvasEl = ref<HTMLCanvasElement | null>(null); // Lien vers <canvas>
let stream: MediaStream | null = null; // Le flux vidéo brut
const cameraActive = ref(false);
const showVideo = ref(false);

// --- CYCLE DE VIE (LIFECYCLE) ---
// Ce code s'exécute dès que la page s'affiche
onMounted(async () => {
  // 1. On demande la liste des salons à l'API via le Store
  await chatStore.fetchRooms();
  loading.value = false;

  // 2. On présélectionne le premier salon pour aider l'utilisateur
  if (chatStore.rooms.length > 0) {
    selectedRoom.value = chatStore.rooms[0].id;
  }

  // 3. Si l'utilisateur a déjà un pseudo en mémoire, on le remet
  if (chatStore.currentUser?.username) {
    pseudo.value = chatStore.currentUser.username;
  }

  // 4. On lance la détection de la batterie
  initBattery();
});

// --- FONCTIONS HARDWARE ---

// API BATTERIE (navigator.getBattery)
function initBattery() {
  if ('getBattery' in navigator) {
    (navigator as any).getBattery().then((batt: any) => {
      battery.value = batt;
      // On écoute les changements (ex: si on branche le chargeur)
      batt.addEventListener('levelchange', () => { battery.value = batt; });
      batt.addEventListener('chargingchange', () => { battery.value = batt; });
    });
  }
}

// API GÉOLOCALISATION (navigator.geolocation)
function getGeo() {
  if (!navigator.geolocation) {
    alert("Géolocalisation non supportée");
    return;
  }
  // Demande la position unique (pas de suivi en temps réel)
  navigator.geolocation.getCurrentPosition(
    (pos) => { coords.value = pos.coords; }, // Succès
    (err) => { alert("Impossible de vous localiser (Autorisation refusée ?)"); } // Erreur
  );
}

// VALIDATION DU FORMULAIRE (Computed)
// Renvoie VRAI seulement si tout est rempli. Sinon le bouton reste gris.
const isFormValid = computed(() => {
  return pseudo.value.trim().length > 0 && avatar.value !== null && selectedRoom.value;
});

// Helper pour mettre des icônes sympas selon le nom du salon
function getRoomIcon(name: string) {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('general')) return '💬';
  if (lowerName.includes('tech') || lowerName.includes('dev')) return '💻';
  if (lowerName.includes('game') || lowerName.includes('jeu')) return '🎮';
  if (lowerName.includes('music')) return '🎵';
  if (lowerName.includes('sport')) return '⚽';
  return '📢';
}

// --- LOGIQUE CAMÉRA (POINT TECHNIQUE IMPORTANT) ---

// 1. Démarrer la caméra
async function startCamera() {
  if (!import.meta.client) return; // Sécurité (ne pas lancer sur le serveur)
  avatar.value = null; // On efface l'ancienne photo
  try {
    // On demande l'accès vidéo. 'facingMode: user' = Caméra Selfie
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, 
      audio: false 
    });
    
    // On connecte le flux à la balise <video>
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
      // On s'assure que la vidéo joue bien
      videoEl.value.onloadedmetadata = () => {
        if(videoEl.value) videoEl.value.play();
      };
    }
    cameraActive.value = true;
    showVideo.value = true;
  } catch (err) {
    console.error(err);
    alert("Impossible d'accéder à la caméra (Vérifiez les permissions HTTPS)");
  }
}

// 2. Arrêter la caméra (pour économiser la batterie)
function stopCamera() {
  if (stream) {
    // On coupe toutes les pistes (tracks) vidéo
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  cameraActive.value = false;
  showVideo.value = false;
}

// 3. Prendre la photo
function takePhoto() {
  if (!videoEl.value || !canvasEl.value) return;
  
  // Petit effet visuel de flash
  isFlashing.value = true;
  setTimeout(() => isFlashing.value = false, 200);

  const video = videoEl.value;
  const canvas = canvasEl.value;
  
  // On dimensionne le canvas comme la vidéo
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // EFFET MIROIR : On inverse l'image horizontalement pour que ce soit naturel (comme un miroir)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    
    // On dessine l'image actuelle de la vidéo sur le canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  // On convertit le dessin en chaîne de caractères Base64 (image/jpeg)
  avatar.value = canvas.toDataURL('image/jpeg', 0.8);
  
  // On éteint la caméra
  stopCamera();
}

function retake() {
  avatar.value = null;
  startCamera();
}

// --- LOGIN (ACTION FINALE) ---
function login() {
  if (!isFormValid.value) return;

  // Demande permission Notification (nécessaire sur clic utilisateur)
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission();
  }

  // 1. On sauvegarde les infos dans Pinia
  chatStore.setUser(pseudo.value, avatar.value!);
  
  // 2. On lance la connexion Socket.IO
  chatStore.connectToServer(selectedRoom.value);
  
  // 3. On change de page vers la Room
  router.push(`/room/${selectedRoom.value}`);
}

// Quand on quitte la page, on s'assure que la caméra est éteinte
onBeforeUnmount(() => {
  stopCamera();
});
</script>

<style scoped>
/* =========================================
   STYLE RESPONSIVE ET MODERNE
   ========================================= */

/* --- MISE EN PAGE RESPONSIVE --- */
.page-wrapper {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  background-color: #f8f9fa;
  /* MOBILE : Alignement en haut pour éviter les problèmes de clavier virtuel */
  align-items: flex-start; 
}

/* TABLETTE/PC : On centre tout verticalement pour faire joli */
@media (min-width: 768px) {
  .page-wrapper {
    align-items: center;
    padding: 20px;
  }
}

.page-container {
  width: 100%;
  max-width: 500px; /* Largeur max pour que ce soit lisible sur PC */
  padding: 20px 20px 120px 20px; /* Marge en bas pour le bouton flottant sur mobile */
  font-family: -apple-system, sans-serif;
  color: #333;
}

/* PC : On enlève la grosse marge en bas car le bouton n'est plus flottant */
@media (min-width: 768px) {
  .page-container {
    padding-bottom: 20px;
  }
}

.header { text-align: center; margin-bottom: 2rem; }
.header h1 { font-size: 2rem; margin-bottom: 0.5rem; color: #111; }
.subtitle { color: #666; font-size: 1rem; }

/* Carte Blanche style iOS */
.card {
  background: white; border-radius: 24px; padding: 2rem;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.08); margin-bottom: 2rem;
}

.form-group { margin-bottom: 1.5rem; }
.form-group label { display: block; font-weight: 700; margin-bottom: 0.5rem; }
.input-modern {
  width: 100%; padding: 14px 16px; border: 2px solid #e5e7eb; border-radius: 14px;
  font-size: 1rem; transition: all 0.3s; background: #f9fafb; box-sizing: border-box;
}
.input-modern:focus { border-color: #3b82f6; background: white; outline: none; }

/* --- HARDWARE (Responsive Wrap) --- */
.hardware-row {
  display: flex; gap: 10px; margin-bottom: 1.5rem; justify-content: center;
  /* Permet aux boutons de passer à la ligne sur les très petits écrans */
  flex-wrap: wrap; 
}
.hw-pill {
  background: #f3f4f6; border-radius: 20px; padding: 8px 16px;
  font-size: 0.85rem; font-weight: 600; color: #4b5563;
  display: flex; align-items: center; gap: 6px; white-space: nowrap;
}
.hw-pill.charging { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.hw-pill.clickable { cursor: pointer; border: 1px solid transparent; }
.hw-pill.clickable:hover { background: #e5e7eb; }
.hw-pill.active { background: #dcfce7; color: #166534; border-color: #bbf7d0; }

/* --- STYLE CAMERA --- */
.camera-wrapper { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.viewfinder {
  width: 100%; max-width: 260px; aspect-ratio: 1/1; /* Carré parfait */
  background: #000; border-radius: 50%; overflow: hidden; position: relative;
  border: 4px solid #fff; box-shadow: 0 0 0 4px #e5e7eb;
}
/* transform: scaleX(-1) crée l'effet miroir */
.video-feed, .photo-preview { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
.placeholder-cam { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #9ca3af; background: #f3f4f6; }

/* Animation du flash */
.flash-anim { animation: flash 0.3s; }
@keyframes flash {
  0% { opacity: 1; } 50% { opacity: 0; background: white; } 100% { opacity: 1; }
}

.cam-controls { height: 60px; display: flex; align-items: center; justify-content: center; }
.btn-icon { background: #f3f4f6; border: none; padding: 10px 24px; border-radius: 30px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.capture-btn { width: 64px; height: 64px; border-radius: 50%; border: 4px solid white; background: #ef4444; box-shadow: 0 0 0 3px #ef4444; cursor: pointer; }
.btn-text { background: none; border: none; color: #2563eb; font-weight: 600; cursor: pointer; text-decoration: underline; }

/* --- GRILLE RESPONSIVE DES SALONS --- */
.rooms-grid { 
  display: grid; 
  /* TRUC DE PRO : Remplit la ligne avec autant de cartes que possible (min 130px) */
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); 
  gap: 12px; 
}

.room-card {
  background: white; border: 2px solid #e5e7eb; border-radius: 16px; padding: 15px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: 8px; cursor: pointer; transition: all 0.2s;
}
.room-card:hover { transform: translateY(-2px); border-color: #bfdbfe; }
.room-card.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }

/* --- BOUTON D'ACTION RESPONSIVE --- */
.action-area {
  /* MOBILE : Fixé en bas de l'écran avec un fond dégradé */
  position: fixed; bottom: 0; left: 0; width: 100%; padding: 20px;
  background: linear-gradient(to top, rgba(255,255,255,0.95) 70%, transparent); 
  text-align: center; z-index: 20; box-sizing: border-box;
}

/* PC/TABLETTE : On annule la position fixe, le bouton se met à la suite */
@media (min-width: 768px) {
  .action-area {
    position: static;
    background: none;
    padding: 30px 0 0 0;
    width: 100%;
  }
}

.btn-main {
  width: 100%; background: #2563eb; color: white; border: none;
  padding: 18px; font-size: 1.1rem; font-weight: 800; border-radius: 18px; cursor: pointer;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: transform 0.2s;
}
.btn-main:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
.btn-main:disabled { background: #d1d5db; box-shadow: none; cursor: not-allowed; }
</style>