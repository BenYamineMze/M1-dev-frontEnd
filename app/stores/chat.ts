import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

export type Message = {
  id: string;
  author: string;
  text: string;     // Le texte du message
  photo?: string;   // L'image (Base64)
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
    // --- 1. RÉCUPÉRATION DES ROOMS ---
    async fetchRooms() {
      try {
        const response = await fetch('https://api.tools.gavago.fr/api/rooms');
        const json = await response.json();
        
        if (json.data) {
           this.rooms = Object.keys(json.data).map(key => ({
             id: key,
             name: key 
           }));
        }
      } catch (e) {
        console.error("Erreur chargement rooms:", e);
        this.rooms = [{ id: 'general', name: 'Général' }];
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
      // On demande la permission de notifier dès la connexion
      if ('Notification' in window && Notification.permission !== 'granted') {
        Notification.requestPermission();
      }
    },

    // --- 2. CONNEXION SOCKET ---
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      if ($socket.connected) {
         $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
         return;
      }

      $socket.offAny(); // Nettoyage
      $socket.connect()

      $socket.on('connect', () => {
        this.isConnected = true
        $socket.emit('chat-join-room', { pseudo: myPseudo, roomName })
      })

      $socket.on('erreur', (err: any) => console.error("⛔ API Error:", err));

      // --- RÉCEPTION MESSAGE DU SERVEUR ---
      $socket.on('chat-msg', (msg: any) => {
         if (msg.categorie === 'INFO') return; // Ignore les infos système

         // CORRECTION IMAGE : Si c'est une image, texte = vide
         const isImage = msg.categorie === 'NEW_IMAGE';
         
         const formattedMsg: Message = {
            id: msg.id || Math.random().toString(36),
            author: msg.pseudo || msg.userId || 'Inconnu',
            
            // ICI C'EST IMPORTANT : 
            // Si c'est une image, on met le texte à vide pour ne pas afficher le code bizarre
            text: isImage ? '' : msg.content, 
            photo: isImage ? msg.content : undefined,
            
            date: msg.dateEmis || new Date().toISOString(),
            roomId: msg.roomName || roomName,
            isSystem: false
         }
         
         this.handleIncomingMessage(formattedMsg)
      })
    },

    // --- 3. ENVOI DE MESSAGE ---
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      
      // Si photo, on l'envoie comme contenu
      const content = photo || text; 

      if (this.isConnected) {
        // Le serveur détectera automatiquement si c'est du base64 (image)
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // Ajout local immédiat (Optimistic UI)
      this.handleIncomingMessage({
        id: Math.random().toString(36),
        author: this.currentUser?.username || 'Moi',
        // CORRECTION LOCAL : Si j'envoie une photo, je ne mets pas de texte
        text: photo ? '' : text, 
        photo: photo || undefined,
        date: new Date().toISOString(),
        roomId: roomId
      })
    },

    // --- 4. TRAITEMENT & NOTIFICATIONS ---
    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      this.messages[roomId].push(msg)

      // Limite à 30 messages pour éviter le crash
      if (this.messages[roomId].length > 30) {
         this.messages[roomId] = this.messages[roomId].slice(-30);
      }

      // --- GESTION NOTIFICATIONS & VIBRATION ---
      // On ne notifie que si ce n'est PAS moi qui ai envoyé le message
      if (msg.author !== this.currentUser?.username) {
        
        // 1. Vibration
        if (navigator.vibrate) navigator.vibrate(200);

        // 2. Notification Système (Windows/Android)
        if ('Notification' in window && Notification.permission === 'granted') {
           const notifBody = msg.photo ? '📷 A envoyé une photo' : msg.text;
           
           new Notification(`Message de ${msg.author}`, {
             body: notifBody,
             icon: '/pwa-192x192.png' // Assure-toi d'avoir une icône ou retire cette ligne
           });
        }
      }
    }
  }
})