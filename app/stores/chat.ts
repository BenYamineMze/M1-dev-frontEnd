import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

export type Message = {
  id: string;
  author: string;
  text: string;
  date: string;
  photo?: string; 
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
    rooms: [] as Room[], // On va remplir ça via l'API
    messages: {} as Record<string, Message[]>
  }),

  actions: {
    // --- 1. RÉCUPÉRATION DES ROOMS (API REST) ---
    async fetchRooms() {
      try {
        const response = await fetch('https://api.tools.gavago.fr/api/rooms');
        const json = await response.json();
        
        // L'API renvoie une structure complexe, on l'adapte
        // Regarde la doc : data -> general -> clients...
        // Si l'API renvoie directement une liste ou un objet, adapte ici.
        // Basé sur ta doc "L'entité Rooms", ça semble renvoyer un objet "data".
        
        if (json.data) {
           // On transforme l'objet en tableau pour l'affichage
           this.rooms = Object.keys(json.data).map(key => ({
             id: key,
             name: key // Le nom est la clé (ex: "general")
           }));
        }
      } catch (e) {
        console.error("Erreur chargement rooms:", e);
        // Fallback si l'API plante
        this.rooms = [{ id: 'general', name: 'Général' }];
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // --- 2. CONNEXION CIBLÉE ---
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      // Si on change de room, on peut se déconnecter/reconnecter ou juste join
      if ($socket.connected) {
         // Si déjà connecté, on rejoint juste la nouvelle room
         $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
         return;
      }

      // Nettoyage brutal des anciens écouteurs
      $socket.offAny(); // Supprime TOUT

      $socket.connect()

      $socket.on('connect', () => {
        this.isConnected = true
        console.log(`🟢 Connecté ! Rejoindre : ${roomName}`)
        
        $socket.emit('chat-join-room', {
          pseudo: myPseudo,
          roomName: roomName
        })
      })

      // Gestion Erreur API
      $socket.on('erreur', (err: any) => console.error("⛔ API Error:", err));

      // Réception Messages
      $socket.on('chat-msg', (msg: any) => {
         // 1. FILTRE SPAM
         if (msg.categorie === 'INFO') return; // On ignore les infos de connexion

         // 2. FORMATAGE
         const isImage = msg.categorie === 'NEW_IMAGE';
         const formattedMsg: Message = {
            id: msg.id || Math.random().toString(36), // ID simple et rapide
            author: msg.pseudo || msg.userId || 'Inconnu',
            text: isImage ? '' : msg.content, 
            photo: isImage ? msg.content : undefined, 
            date: msg.dateEmis || new Date().toISOString(),
            roomId: msg.roomName || roomName, // Utilise la room courante si null
            isSystem: false
         }
         
         this.handleIncomingMessage(formattedMsg)
      })
    },

    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      const content = photo || text; // Priorité photo

      if (this.isConnected) {
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // Ajout local (Optimistic)
      this.handleIncomingMessage({
        id: Math.random().toString(36),
        author: this.currentUser?.username || 'Moi',
        text: text,
        photo: photo || undefined,
        date: new Date().toISOString(),
        roomId: roomId
      })
    },

    // --- 3. PROTECTION ANTI-CRASH ---
    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // Ajout
      this.messages[roomId].push(msg)

      // NETTOYAGE AGRESSIF : On ne garde que les 30 derniers messages
      // C'est ça qui empêche le crash si le serveur envoie 1000 items
      if (this.messages[roomId].length > 30) {
         // On enlève les plus vieux (au début du tableau)
         this.messages[roomId] = this.messages[roomId].slice(-30);
      }
    }
  }
})