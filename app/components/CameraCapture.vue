<template>
<div>
<button class="btn" @click="start">Ouvrir caméra</button>
<button class="btn" @click="take" v-if="stream">Prendre photo</button>
<video ref="videoEl" autoplay playsinline style="max-width:100%"></video>
</div>
</template>


<script setup lang="ts">
const videoEl = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null


async function start() {
stream = await navigator.mediaDevices.getUserMedia({ video: true })
if (videoEl.value) videoEl.value.srcObject = stream
}


function stop() {
stream?.getTracks().forEach(t => t.stop())
stream = null
}


function take() {
if (!videoEl.value) return
const video = videoEl.value
const canvas = document.createElement('canvas')
canvas.width = video.videoWidth || 640
canvas.height = video.videoHeight || 480
const ctx = canvas.getContext('2d')
ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
const dataUrl = canvas.toDataURL('image/png')
// emit to parent
;(defineEmits(['photo']) as any)().photo(dataUrl)
// notification
if ('Notification' in window && Notification.permission === 'granted') {
new Notification('Photo prise')
} else if ('Notification' in window) {
Notification.requestPermission()
}
stop()
}


onUnmounted(() => stop())
</script>