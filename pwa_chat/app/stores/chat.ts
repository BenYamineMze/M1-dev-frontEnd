import { defineStore } from 'pinia'


type Message = { author: string; text: string; date?: string; photo?: string }


export const useChatStore = defineStore('chat', {
state: () => ({
rooms: [{ id: 'general', name: 'Général' } as any],
messages: {} as Record<string, Message[]>
}),
actions: {
loadOfflineData() {
const data = localStorage.getItem('chat.data')
if (data) {
try { const parsed = JSON.parse(data); Object.assign(this.$state, parsed) } catch {}
}
},
saveOfflineData() {
localStorage.setItem('chat.data', JSON.stringify({ rooms: this.rooms, messages: this.messages }))
},
addMessage(roomId: string, message: Message) {
if (!this.messages[roomId]) this.messages[roomId] = []
const msg = { ...message, date: new Date().toISOString() }
this.messages[roomId].push(msg)
this.saveOfflineData()
},
createRoom(id: string, name: string) {
if (!this.rooms.find(r => r.id === id)) {
this.rooms.push({ id, name })
this.saveOfflineData()
}
},
leaveRoom(roomId: string) {
// offline: juste supprimer localement
delete this.messages[roomId]
this.rooms = this.rooms.filter(r => r.id !== roomId)
this.saveOfflineData()
}
}
})