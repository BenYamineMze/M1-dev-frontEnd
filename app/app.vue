<template>
  <div>
    <NuxtRouteAnnouncer />
    <!--<NuxtWelcome />-->
    <!--<Header />-->
    <!--<Menu />-->
    <NuxtPage />
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useChatStore } from '~/stores/chat';

const chatStore = useChatStore();

// Fonction qui se lance quand Internet revient
const handleOnline = () => {
  console.log("🌐 Réseau détecté !");
  // On force la reconnexion, ce qui déclenchera processOfflineQueue()
  // test
  chatStore.connectToServer();
};

onMounted(() => {
  window.addEventListener('online', handleOnline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
});
</script>