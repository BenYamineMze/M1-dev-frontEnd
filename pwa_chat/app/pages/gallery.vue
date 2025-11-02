<template>
<div class="container">
    <h1>Galerie des photos</h1>
    <div class="gallery">
      <div v-for="(p, idx) in photos" :key="idx" class="thumb">
        <img :src="p" alt="photo" />
        <button class="del" @click="remove(idx)">Supprimer</button>
      </div>
    </div>

    <nav>
      <nuxt-link to="/room">⬅ Retour au chat</nuxt-link>
      <!--
      <a href="room.html">⬅ Retour au chat</a>
      -->
    </nav>
  </div>
</template>


<script setup lang="ts">

import { ref, onMounted } from 'vue';

const photos = ref<string[]>([]);

function load() {
  const raw = localStorage.getItem('gallery_photos');
  photos.value = raw ? JSON.parse(raw) : [];
}

function remove(i: number) {
  if (!confirm('Supprimer cette photo ?')) return;
  photos.value.splice(i, 1);
  localStorage.setItem('gallery_photos', JSON.stringify(photos.value));
}

onMounted(() => load());

</script>