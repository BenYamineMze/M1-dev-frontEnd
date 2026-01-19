<template>
  <div class="page-container">
    
    <header class="gallery-header">
      <NuxtLink to="/room" class="btn-icon">⬅️</NuxtLink>
      <h1>Mes Photos ({{ allPhotos.length }})</h1>
      <div style="width: 40px;"></div>
    </header>

    <div class="gallery-grid">
      <div v-if="allPhotos.length === 0" class="empty-state">
        <span class="icon">📷</span>
        <p>Pas encore de photos.</p>
        <NuxtLink to="/room" class="link">Aller prendre une photo</NuxtLink>
      </div>

      <div 
        v-for="(photo, index) in allPhotos" 
        :key="photo.id" 
        class="photo-item"
      >
        <img :src="photo.src" @click="openLightbox(photo)" loading="lazy" />
        
        <button class="btn-delete" @click.stop="removePhoto(photo)">
          🗑️
        </button>

        <span class="photo-room-badge">{{ photo.roomName }}</span>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="selectedPhoto" class="lightbox" @click.self="closeLightbox">
        <button class="close-btn" @click="closeLightbox">✕</button>
        <img :src="selectedPhoto.src" class="lightbox-img" />
        
        <div class="lightbox-actions">
          <p>Dans <strong>{{ selectedPhoto.roomName }}</strong></p>
          <button class="btn-download" @click="downloadImage(selectedPhoto.src)">
            💾 Sauvegarder
          </button>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useChatStore, type Message } from '~/stores/chat';

const chatStore = useChatStore();
const selectedPhoto = ref<any | null>(null);

// Type local pour l'affichage
type GalleryPhoto = {
  id: string;      // ID du message original (pour suppression)
  src: string;     // Base64 de l'image
  date?: string;
  roomName: string;
  roomId: string;
}

// Récupère toutes les images depuis le store Pinia
const allPhotos = computed(() => {
  const list: GalleryPhoto[] = [];
  
  // On parcourt toutes les rooms du store
  for (const [roomId, messages] of Object.entries(chatStore.messages)) {
    const roomName = chatStore.rooms.find(r => r.id === roomId)?.name || 'Inconnu';
    
    // On extrait uniquement les messages qui ont une photo
    (messages as any[]).forEach((m) => {
      if (m.photo) {
        list.push({
          id: m.id || m.date, // Fallback si pas d'ID
          src: m.photo,
          date: m.date,
          roomId: roomId,
          roomName: roomName
        });
      }
    });
  }
  
  // Tri par date (plus récent en premier)
  return list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
});

// Ta fonction de suppression adaptée au Store
function removePhoto(photo: GalleryPhoto) {
  if (!confirm('Voulez-vous vraiment supprimer cette photo ? Elle disparaîtra aussi de la conversation.')) return;
  
  // Appel au store pour supprimer le message contenant la photo
  chatStore.deleteMessage(photo.roomId, photo.id);
  
  // Si la photo était ouverte en grand, on la ferme
  if (selectedPhoto.value?.id === photo.id) {
    closeLightbox();
  }
}

function openLightbox(photo: GalleryPhoto) {
  selectedPhoto.value = photo;
}

function closeLightbox() {
  selectedPhoto.value = null;
}

function downloadImage(base64: string) {
  const link = document.createElement('a');
  link.href = base64;
  link.download = `photo-${Date.now()}.jpg`;
  link.click();
}

onMounted(() => {
  chatStore.init();
});
</script>

<style scoped>
/* --- DESIGN MOBILE MODERN --- */
.page-container {
  min-height: 100vh;
  background: #f0f2f5;
  padding-bottom: 20px;
  font-family: -apple-system, sans-serif;
}

.gallery-header {
  position: sticky;
  top: 0;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(8px);
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}
.gallery-header h1 { margin: 0; font-size: 1.2rem; }
.btn-icon { text-decoration: none; font-size: 1.5rem; }

/* GRILLE */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 images par ligne */
  gap: 2px;
}

.photo-item {
  position: relative;
  aspect-ratio: 1/1; /* Carré */
  overflow: hidden;
  background: #ddd;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
  cursor: pointer;
}
.photo-item img:active { transform: scale(0.95); }

/* BOUTON SUPPRIMER (Overlay) */
.btn-delete {
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 0, 0, 0.7);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.photo-room-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 2px 5px;
  background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
  color: white;
  font-size: 0.6rem;
  pointer-events: none;
}

/* VIDE */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px;
  color: #888;
}
.empty-state .icon { font-size: 3rem; display: block; margin-bottom: 10px; }
.link { color: #2563eb; }

/* LIGHTBOX */
.lightbox {
  position: fixed;
  top:0; left:0; right:0; bottom:0;
  background: rgba(0,0,0,0.95);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.lightbox-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}
.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.2);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.5rem;
  cursor: pointer;
}
.lightbox-actions {
  margin-top: 20px;
  text-align: center;
  color: white;
}
.btn-download {
  margin-top: 10px;
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>