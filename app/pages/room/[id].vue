<script setup lang="ts">
import { useRoute } from '#imports'
import { useChatStore } from '~/stores/chat'
import { useUserStore } from '~/stores/user'
import CameraCapture from '~/components/CameraCapture.vue'


const route = useRoute()
const chat = useChatStore()
const user = useUserStore()
const roomId = route.params.id as string


const text = ref('')


chat.loadOfflineData()


function send() {
if (!text.value) return
chat.addMessage(roomId, { author: user.pseudo ?? 'Anonyme', text: text.value })
text.value = ''
}


function addPhoto(dataUrl: string) {
chat.addMessage(roomId, { author: user.pseudo ?? 'Anonyme', text: '[photo]', photo: dataUrl })
}
</script>


<template>
<div class="container">
<h1>Room: {{ roomId }}</h1>
<div class="card">
<MessageList :messages="chat.messages[roomId] ?? []" />
<input v-model="text" placeholder="Message..." />
<button class="btn" @click="send">Envoyer</button>
</div>


<div class="mt-4">
<CameraCapture @photo="addPhoto" />
</div>
</div>
</template>