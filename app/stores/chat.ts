import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

// =================================================================
// 1. DÉFINITION DES TYPES
// =================================================================
export type Message = {
  id: string;        
  author: string;    
  text: string;      // Vide si c'est une image
  photo?: string;    // Contient le code de l'image (Base64) si c'en est une
  date: string;      
  roomId?: string;   
  isSystem?: boolean; 
}

export type Room = {
  id: string;
  name: string;
}

export const useChatStore = defineStore('chat', {
  
  // --- STATE (Mémoire) ---
  state: () => ({
    isConnected: false,
    currentUser: null as { username: string, photo: string } | null,
    rooms: [] as Room[],
    messages: {} as Record<string, Message[]>
  }),

  actions: {
    // -----------------------------------------------------------------
    // ACTION : RECUPERER LES ROOMS
    // -----------------------------------------------------------------
    async fetchRooms() {
      // Liste de secours
      const defaultRooms = [
        { id: 'general', name: 'Général 💬' },
        { id: 'sport', name: 'Sport ⚽' },
        { id: 'tech', name: 'Tech 💻' },
        { id: 'gaming', name: 'Gaming 🎮' }
      ];

      try {
        // On tente de joindre l'API
        const response = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
        const json = await response.json();
        
        let serverRooms: Room[] = [];
        if (json.success && json.data) {
           serverRooms = Object.keys(json.data).map(key => ({ id: key, name: key }));
        }

        // On fusionne sans doublons
        const mergedRooms = [...defaultRooms];
        serverRooms.forEach(srvRoom => {
          if (!mergedRooms.some(r => r.id === srvRoom.id)) mergedRooms.push(srvRoom);
        });

        this.rooms = mergedRooms;

      } catch (e) {
        console.error("⚠️ Erreur API Rooms, repli sur défauts.");
        this.rooms = defaultRooms;
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // -----------------------------------------------------------------
    // ACTION : CONNEXION (C'est ici que tout se joue pour les doublons)
    // -----------------------------------------------------------------
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'

      // ÉTAPE 1 : NETTOYAGE DRASTIQUE (ANTI-DOUBLON)
      // On supprime TOUS les écouteurs précédents sur 'chat-msg'.
      // Si on ne fait pas ça, à chaque fois que tu changes de page, 
      // un nouvel écouteur s'ajoute et tu reçois les messages en double/triple.
      $socket.off('chat-msg'); 
      $socket.off('connect');

      // ÉTAPE 2 : CONNEXION
      if (!$socket.connected) {
        $socket.connect();
      }

      // On rejoint la salle
      $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
      this.isConnected = true;

      // ÉTAPE 3 : ÉCOUTE UNIQUE DES MESSAGES
      $socket.on('chat-msg', (msg: any) => {
         // On traite le message reçu
         this.processIncomingMessage(msg, roomName);
      });
    },

    // -----------------------------------------------------------------
    // FONCTION : TRAITEMENT INTELLIGENT DU MESSAGE
    // -----------------------------------------------------------------
    processIncomingMessage(msg: any, currentRoomName: string) {
       // On ignore les infos techniques
       if (msg.categorie === 'INFO') return;

       // --- CORRECTION IMAGE ---
       // On regarde le contenu. Si ça commence par "data:image", C'EST UNE IMAGE.
       // Peu importe ce que dit le serveur (qui se trompe parfois).
       const content = msg.content || '';
       const isImage = msg.categorie === 'NEW_IMAGE' || content.startsWith('data:image');
       
       const formattedMsg: Message = {
          id: msg.id || Math.random().toString(36),
          author: msg.pseudo || msg.userId || 'Inconnu',
          
          // Si c'est une image, on VIDE le texte (pour ne pas voir le code bizarre)
          text: isImage ? '' : content, 
          
          // Si c'est une image, on remplit la variable photo
          photo: isImage ? content : undefined,
          
          date: msg.dateEmis || new Date().toISOString(),
          roomId: msg.roomName || currentRoomName,
          isSystem: false
       }

       this.addMessageToStore(formattedMsg);
    },

    deleteMessage(roomId: string, messageId: string) {
      if (this.messages[roomId]) {
        // On filtre la liste pour enlever le message ciblé
        this.messages[roomId] = this.messages[roomId].filter(m => m.id !== messageId);
      }
    },

    // -----------------------------------------------------------------
    // ACTION : ENVOYER (SANS AJOUT LOCAL)
    // -----------------------------------------------------------------
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      
      // On envoie soit la photo, soit le texte
      const content = photo || text; 

      if (this.isConnected) {
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // ⛔️ IMPORTANT : ON N'AJOUTE RIEN DANS LA LISTE ICI !
      // On attend que le serveur nous renvoie le message via 'chat-msg'.
      // C'est la seule façon d'être sûr à 100% de ne pas avoir de doublons.
    },

    // -----------------------------------------------------------------
    // FONCTION : STOCKAGE DANS LA LISTE
    // -----------------------------------------------------------------
    addMessageToStore(msg: Message) {
      const roomId = msg.roomId || 'general'
      
      // Création de la liste si elle n'existe pas
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // 🛡️ SÉCURITÉ ULTIME ANTI-DOUBLON 🛡️
      // On vérifie si ce message précis (même ID) est déjà là.
      const exists = this.messages[roomId].some(m => m.id === msg.id);
      if (exists) return; // Si oui, poubelle.

      // Ajout
      this.messages[roomId].push(msg);

      // Limite mémoire (50 derniers messages)
      if (this.messages[roomId].length > 50) {
         this.messages[roomId] = this.messages[roomId].slice(-50);
      }
      
      // Notification (seulement si ce n'est pas moi)
      if (msg.author !== this.currentUser?.username) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) try{ navigator.vibrate(200); }catch(e){}
      }
    }
  }
})