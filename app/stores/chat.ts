import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

export type Message = {
  id: string;
  author: string;
  text: string;     
  photo?: string;   
  date: string;
  roomId?: string;
  isSystem?: boolean;
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
    async fetchRooms() {
      try {
        const response = await fetch('https://api.tools.gavago.fr/api/rooms');
        const json = await response.json();
        if (json.data) {
           this.rooms = Object.keys(json.data).map(key => ({ id: key, name: key }));
        }
      } catch (e) {
        this.rooms = [{ id: 'general', name: 'Général' }];
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      if ($socket.connected) {
         $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
         return;
      }

      $socket.offAny(); 
      $socket.connect()

      $socket.on('connect', () => {
        this.isConnected = true
        $socket.emit('chat-join-room', { pseudo: myPseudo, roomName })
      })

      $socket.on('chat-msg', (msg: any) => {
         if (msg.categorie === 'INFO') return; 

         // --- CORRECTION BUG IMAGE "TEXTE LONG" ---
         // Si le serveur dit que c'est une image, ON VIDE LE TEXTE
         const isImage = msg.categorie === 'NEW_IMAGE';
         
         const formattedMsg: Message = {
            id: msg.id || Math.random().toString(36),
            author: msg.pseudo || msg.userId || 'Inconnu',
            
            // ICI : Si c'est une image, text = vide (''). Sinon text = content.
            text: isImage ? '' : msg.content, 
            
            // ICI : Si c'est une image, photo = content.
            photo: isImage ? msg.content : undefined,
            
            date: msg.dateEmis || new Date().toISOString(),
            roomId: msg.roomName || roomName,
            isSystem: false
         }
         
         this.handleIncomingMessage(formattedMsg)
      })
    },

    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      const content = photo || text; 

      if (this.isConnected) {
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // Ajout local
      this.handleIncomingMessage({
        id: Math.random().toString(36),
        author: this.currentUser?.username || 'Moi',
        // CORRECTION : Si j'envoie une photo, je force le texte à vide
        text: photo ? '' : text, 
        photo: photo || undefined,
        date: new Date().toISOString(),
        roomId: roomId
      })
    },

    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      this.messages[roomId].push(msg)
      if (this.messages[roomId].length > 30) {
         this.messages[roomId] = this.messages[roomId].slice(-30);
      }

      // --- CORRECTION NOTIFICATIONS ---
      // On ne notifie que si c'est quelqu'un d'autre
      if (msg.author !== this.currentUser?.username) {
        
        // 1. Vibration
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch(e){}
        }

        // 2. Notification
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
           try {
               new Notification(`Message de ${msg.author}`, {
                 body: msg.photo ? '📷 A envoyé une photo' : msg.text,
                 icon: '/favicon.ico' // Icône par défaut
               });
           } catch (e) { console.error("Notif error", e) }
        }
      }
    }
  }
})