<template>
  <div class="gallery-page">
    
    <header class="header-bar">
      <button class="btn-back" @click="goBack">
        <span class="icon-back">❮</span> Retour
      </button>
      <div class="header-title">
        <h1>Galerie</h1>
        <small>{{ allPhotos.length }} Photos</small>
      </div>
      <div style="width: 40px"></div> </header>

    <div class="photo-grid">
      
      <div v-if="allPhotos.length === 0" class="empty-zone">
        <div class="empty-icon">📷</div>
        <p>Aucune photo partagée pour l'instant.</p>
        <button class="btn-cta" @click="goBack">Retourner au chat</button>
      </div>

      <div 
        v-for="photo in allPhotos" 
        :key="photo.id" 
        class="grid-item"
        @click="openLightbox(photo)"
      >
        <img :src="photo.src" loading="lazy" />
        
        <div class="item-overlay">
          <span class="badge-room">{{ photo.roomName }}</span>
        </div>
      </div>
    </div>

    <Transition name="zoom">
      <div v-if="selectedPhoto" class="lightbox-overlay" @click.self="closeLightbox">
        
        <div class="lightbox-top">
          <button class="btn-close" @click="closeLightbox">✕</button>
          <span class="lightbox-info">{{ formatTime(selectedPhoto.date) }} • {{ selectedPhoto.roomName }}</span>
          <button class="btn-delete" @click="removePhoto(selectedPhoto)">🗑️</button>
        </div>

        <div class="lightbox-center">
          <img :src="selectedPhoto.src" class="lightbox-img" />
        </div>

        <div class="lightbox-bottom">
          <button class="btn-action" @click="downloadImage(selectedPhoto.src)">
            📥 Enregistrer
          </button>
        </div>

      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from '#app';
import { useChatStore } from '~/stores/chat';

const router = useRouter();
const chatStore = useChatStore();
const selectedPhoto = ref<any | null>(null);

// Type local
type GalleryPhoto = {
  id: string;      
  src: string;    
  date?: string;
  roomName: string;
  roomId: string;
}

// Récupération des photos depuis le Store
const allPhotos = computed(() => {
  const list: GalleryPhoto[] = [];
  
  // On scanne toutes les rooms
  for (const [roomId, messages] of Object.entries(chatStore.messages)) {
    // Nom joli de la room
    const roomObj = chatStore.rooms.find(r => r.id === roomId);
    const roomName = roomObj ? roomObj.name : roomId;

    (messages as any[]).forEach((m) => {
      // Si le message a une propriété 'photo'
      if (m.photo) {
        list.push({
          id: m.id || Math.random().toString(),
          src: m.photo,
          date: m.date,
          roomId: roomId,
          roomName: roomName
        });
      }
    });
  }
  
  // Tri du plus récent au plus ancien
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
});

// Navigation
function goBack() {
  router.push('/'); // Ou router.go(-1)
}

function formatTime(d: string) {
  return d ? new Date(d).toLocaleDateString() : '';
}

// Gestion Lightbox
function openLightbox(photo: GalleryPhoto) {
  selectedPhoto.value = photo;
}

function closeLightbox() {
  selectedPhoto.value = null;
}

// Suppression
function removePhoto(photo: GalleryPhoto) {
  if (!confirm('Supprimer cette photo ?')) return;
  
  // On appelle l'action du store (à ajouter dans stores/chat.ts si pas fait)
  // chatStore.deleteMessage(photo.roomId, photo.id); 
  
  // Alternative si tu n'as pas deleteMessage : On force la mise à jour locale
  const roomMsgs = chatStore.messages[photo.roomId];
  if(roomMsgs) {
    chatStore.messages[photo.roomId] = roomMsgs.filter(m => m.id !== photo.id);
  }

  closeLightbox();
}

// Téléchargement
function downloadImage(base64: string) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = `IMG_${Date.now()}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<style scoped>
/* --- PAGE CONTAINER --- */
.gallery-page {
  min-height: 100vh;
  background-color: #000; /* Fond noir style pellicule photo */
  color: white;
  padding-top: 60px; /* Espace pour le header */
}

/* --- HEADER --- */
.header-bar {
  position: fixed; top: 0; left: 0; right: 0;
  height: 60px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 15px; z-index: 50;
  border-bottom: 1px solid #222;
}

.header-title { text-align: center; }
.header-title h1 { margin: 0; font-size: 1rem; font-weight: 600; letter-spacing: 0.5px; }
.header-title small { color: #888; font-size: 0.75rem; }

.btn-back {
  background: none; border: none; color: #0095f6; /* Bleu Instagram */
  font-size: 1rem; cursor: pointer; display: flex; align-items: center; gap: 5px;
}
.icon-back { font-size: 1.2rem; margin-top: -2px; }

/* --- GRID LAYOUT --- */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 colonnes sur mobile */
  gap: 1px; /* Petit espace fin style Insta */
}

/* Responsive Tablette/PC */
@media (min-width: 600px) {
  .photo-grid { grid-template-columns: repeat(4, 1fr); }
}
@media (min-width: 900px) {
  .photo-grid { grid-template-columns: repeat(6, 1fr); }
}

.grid-item {
  position: relative;
  aspect-ratio: 1 / 1; /* Carré parfait */
  background: #222;
  cursor: pointer;
  overflow: hidden;
}

.grid-item img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.3s ease;
}

.grid-item:hover img {
  transform: scale(1.05); /* Zoom léger au survol */
}

/* Overlay Room Name (Discret en bas) */
.item-overlay {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
  padding: 5px; pointer-events: none;
}
.badge-room {
  font-size: 0.6rem; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;
}

/* --- EMPTY STATE --- */
.empty-zone {
  grid-column: 1 / -1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 50vh; color: #555;
}
.empty-icon { font-size: 3rem; margin-bottom: 15px; opacity: 0.5; }
.btn-cta {
  margin-top: 20px; padding: 10px 20px;
  background: #222; color: white; border: 1px solid #444; border-radius: 20px;
  cursor: pointer; transition: background 0.2s;
}
.btn-cta:hover { background: #333; }

/* --- LIGHTBOX (ZOOM) --- */
.lightbox-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: black; z-index: 100;
  display: flex; flex-direction: column;
}

/* Top Bar */
.lightbox-top {
  height: 60px; display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; background: rgba(0,0,0,0.4); z-index: 101;
}
.btn-close { font-size: 1.5rem; background: none; border: none; color: white; cursor: pointer; }
.lightbox-info { font-size: 0.8rem; color: #ccc; }
.btn-delete { background: none; border: none; font-size: 1.2rem; cursor: pointer; }

/* Center Image */
.lightbox-center {
  flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.lightbox-img {
  max-width: 100%; max-height: 100%;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
}

/* Bottom Bar */
.lightbox-bottom {
  height: 80px; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.8);
}
.btn-action {
  background: #333; color: white; border: none;
  padding: 10px 25px; border-radius: 30px;
  font-weight: 600; cursor: pointer;
  display: flex; gap: 8px; align-items: center;
}
.btn-action:hover { background: #444; }

/* ANIMATION */
.zoom-enter-active, .zoom-leave-active { transition: all 0.3s ease; }
.zoom-enter-from, .zoom-leave-to { opacity: 0; transform: scale(0.9); }
</style>