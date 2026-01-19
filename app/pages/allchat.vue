<template>
  <div class="page-container">
    
    <header class="gallery-header">
      <button class="btn-icon" @click="goHome">⬅️</button>
      <h1>Galerie ({{ allPhotos.length }})</h1>
      <div style="width: 40px;"></div> </header>

    <div class="gallery-grid">
      <div v-if="allPhotos.length === 0" class="empty-state">
        <span class="icon">📷</span>
        <p>Aucune photo pour le moment.<br>Allez dans une room pour en prendre !</p>
      </div>

      <div 
        v-for="(img, index) in allPhotos" 
        :key="index" 
        class="photo-item"
        @click="openLightbox(img)"
      >
        <img :src="img.src" loading="lazy" />
        <span class="photo-room-badge">{{ img.roomName }}</span>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="selectedPhoto" class="lightbox" @click.self="closeLightbox">
        <button class="close-btn" @click="closeLightbox">✕</button>
        
        <img :src="selectedPhoto.src" class="lightbox-img" />
        
        <div class="lightbox-actions">
          <p>Envoyé par <strong>{{ selectedPhoto.author }}</strong></p>
          <p class="date">{{ formatDate(selectedPhoto.date) }}</p>
          <a 
            :href="selectedPhoto.src" 
            download="photo-chat.jpg" 
            class="btn-download"
            @click.stop
          >
            💾 Télécharger
          </a>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from '#app';
import { useChatStore, type Message } from '~/stores/chat';

const router = useRouter();
const chatStore = useChatStore();
const selectedPhoto = ref<any | null>(null);

// Structure pour l'affichage
type GalleryItem = {
  src: string;
  author: string;
  date?: string;
  roomName: string;
}

// Récupération automatique de TOUTES les images de TOUTES les rooms
const allPhotos = computed(() => {
  const photos: GalleryItem[] = [];
  
  // On parcourt toutes les clés (rooms) du dictionnaire de messages
  for (const [roomId, messages] of Object.entries(chatStore.messages)) {
    // On trouve le nom de la room pour l'affichage
    const roomName = chatStore.rooms.find(r => r.id === roomId)?.name || 'Inconnu';
    
    // On filtre les messages qui ont une photo
    (messages as Message[]).forEach(m => {
      if (m.photo) {
        photos.push({
          src: m.photo,
          author: m.author,
          date: m.date,
          roomName: roomName
        });
      }
    });
  }
  
  // Tri du plus récent au plus ancien
  return photos.sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
});

function goHome() {
  router.push('/reception');
}

function openLightbox(photo: GalleryItem) {
  selectedPhoto.value = photo;
}

function closeLightbox() {
  selectedPhoto.value = null;
}

function formatDate(isoStr?: string) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('fr-FR', { 
    day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit'
  });
}

onMounted(() => {
  // On s'assure que les données sont chargées
  chatStore.init();
});
</script>

<style scoped>
/* LAYOUT */
.page-container {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 40px;
}

/* HEADER */
.gallery-header {
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  z-index: 10;
}
.gallery-header h1 {
  font-size: 1.2rem;
  margin: 0;
  color: #333;
}
.btn-icon {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}

/* GRID */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 colonnes sur mobile */
  gap: 2px;
  padding: 2px;
}

/* Pour tablette/desktop, on passe à plus de colonnes */
@media (min-width: 600px) {
  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    padding: 10px;
  }
}

.photo-item {
  position: relative;
  aspect-ratio: 1 / 1; /* Carré parfait */
  overflow: hidden;
  cursor: pointer;
  background: #ddd;
}

.photo-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.photo-item:hover img {
  transform: scale(1.1);
}

.photo-room-badge {
  position: absolute;
  bottom: 5px;
  right: 5px;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: 10px;
  backdrop-filter: blur(2px);
}

/* EMPTY STATE */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px 20px;
  color: #888;
}
.empty-state .icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* LIGHTBOX */
.lightbox {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 100;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.lightbox-img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
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
  font-size: 1.2rem;
  cursor: pointer;
}

.lightbox-actions {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 20px;
  background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
  color: white;
  text-align: center;
}
.lightbox-actions p { margin: 5px 0; }
.lightbox-actions .date { font-size: 0.8rem; opacity: 0.7; margin-bottom: 15px; }

.btn-download {
  display: inline-block;
  background: white;
  color: black;
  text-decoration: none;
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 0.9rem;
}

/* TRANSITION FADE */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>