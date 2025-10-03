<template>
  <div>
    <video ref="video" autoplay playsinline></video>
    <button @click="takePhoto">Prendre une photo</button>
    <div v-if="photo">
      <img :src="photo" alt="Photo prise" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const video = ref<HTMLVideoElement | null>(null)
const photo = ref<string | null>(null)

onMounted(async () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (video.value) video.value.srcObject = stream
  }
})

const takePhoto = () => {
  const canvas = document.createElement('canvas')
  if (video.value) {
    canvas.width = video.value.videoWidth
    canvas.height = video.value.videoHeight
    canvas.getContext('2d')?.drawImage(video.value, 0, 0)
    photo.value = canvas.toDataURL('image/png')
    localStorage.setItem('lastPhoto', photo.value)

    // Notifications
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Photo prise!', { body: 'Votre photo a été sauvegardée.' })
    }
  }
}

onMounted(() => {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission()
  }

  // Charger la dernière photo depuis localStorage
  const savedPhoto = localStorage.getItem('lastPhoto')
  if (savedPhoto) photo.value = savedPhoto
})


</script>
