import { defineStore } from 'pinia'

// Définition des types
export type Message = {
  id: string;      // <--- AJOUT CRUCIAL : Il faut un ID pour supprimer
  author: string;
  text: string;
  date?: string;
  photo?: string; 
  roomId?: string; 
}

export type Room = {
  id: string;
  name: string;
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    isConnected: false,
    currentUser: null as { username: string, photo: string } | null,
    rooms: [] as Room[],
    messages: {} as Record<string, Message[]>
  }),

  actions: {
    // ----------------------------------------------------------------
    // PARTIE 1 : INITIALISATION & LOCALSTORAGE
    // ----------------------------------------------------------------
    init() {
      this.loadOfflineData()
      this.connectToServer()
    },

    // --- CORRECTION SYNTAXE ICI ---
    deleteMessage(roomId: string, messageId: string) {
      if (this.messages[roomId]) {
        // On garde tous les messages SAUF celui qui a l'ID donné
        this.messages[roomId] = this.messages[roomId].filter(m => m.id !== messageId);
        this.saveOfflineData();
      }
    },
    // ------------------------------

    loadOfflineData() {
      if (import.meta.client) {
        const data = localStorage.getItem('chat.data')
        if (data) {
          try { 
            const parsed = JSON.parse(data);
            if(parsed.messages) this.messages = parsed.messages
            if(parsed.rooms && parsed.rooms.length > 0) this.rooms = parsed.rooms
            if(parsed.currentUser) this.currentUser = parsed.currentUser
          } catch (e) { console.error("Erreur lecture cache", e)}
        }
      }
    },

    saveOfflineData() {
      if (import.meta.client) {
        localStorage.setItem('chat.data', JSON.stringify({ 
          rooms: this.rooms, 
          messages: this.messages,
          currentUser: this.currentUser
        }))
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
      this.saveOfflineData()
    },

    // ----------------------------------------------------------------
    // PARTIE 2 : SOCKET.IO & RÉSEAU
    // ----------------------------------------------------------------
    connectToServer() {
      const { $socket } = useNuxtApp() 
      
      if ($socket && !$socket.connected) {
        $socket.auth = { username: this.currentUser?.username }
        $socket.connect()

        $socket.on('connect', () => {
          this.isConnected = true
          console.log("Connecté au serveur Socket !")
        })

        $socket.on('roomList', (serverRooms: Room[]) => {
            this.rooms = serverRooms
            this.saveOfflineData()
        })

        $socket.on('message', (msg: Message) => {
           this.handleIncomingMessage(msg)
        })
        
        $socket.on('disconnect', () => {
          this.isConnected = false
        })
      }
    },

    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // --- ANTI-DOUBLON ---
      // Si le message existe déjà (grâce à l'ID), on ne l'ajoute pas
      const exists = this.messages[roomId].find(m => m.id === msg.id);
      if (exists) return; 

      this.messages[roomId].push(msg)
      this.saveOfflineData()

      // --- HARDWARE ---
      if (msg.author !== this.currentUser?.username && import.meta.client) {
         if (navigator.vibrate) navigator.vibrate(200);
         
         if (Notification.permission === "granted") {
           new Notification(`Message de ${msg.author}`, { body: msg.text })
         }
      }
    },

    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      
      // --- GÉNÉRATION ID ---
      // On crée un ID unique ici pour pouvoir gérer la suppression plus tard
      const newMessage: Message = {
        id: crypto.randomUUID(), // Nécessite HTTPS (localhost ok)
        author: this.currentUser?.username || 'Anonyme',
        text: text,
        photo: photo || undefined,
        roomId: roomId,
        date: new Date().toISOString()
      }

      if (this.isConnected) {
        $socket.emit('sendMessage', newMessage)
        // Optimistic UI : on l'affiche tout de suite
        this.handleIncomingMessage(newMessage)
      } 
      else {
        console.warn("Offline : Message sauvegardé localement")
        this.handleIncomingMessage(newMessage)
      }
    }
  }
})