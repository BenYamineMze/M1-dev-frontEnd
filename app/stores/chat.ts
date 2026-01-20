import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

// =================================================================
// 1. DÉFINITION DES TYPES (TypeScript)
// =================================================================
// Ce contrat permet de sécuriser les échanges de données.
export type Message = {
  id: string;        // ID unique pour éviter les doublons
  author: string;    // Pseudo de l'expéditeur
  text: string;      // Contenu texte (vide si c'est une image)
  photo?: string;    // Contenu image en Base64 (optionnel)
  date: string;      // Date ISO pour le tri chronologique
  roomId?: string;   // Pour savoir à quel salon appartient le message
  isSystem?: boolean; // Pour les messages techniques (ex: "Bienvenue")
}

export type Room = {
  id: string;
  name: string;
}

// =================================================================
// 2. LE STORE PINIA (Le Cerveau)
// =================================================================
export const useChatStore = defineStore('chat', {
  
  // --- STATE (La Mémoire) ---
  state: () => ({
    isConnected: false, 
    currentUser: null as { username: string, photo: string } | null,
    rooms: [] as Room[],
    // Stockage des messages par ID de salon (ex: messages['sport'] = [...])
    messages: {} as Record<string, Message[]> 
  }),

  actions: {
    // -----------------------------------------------------------------
    // ACTION A : RÉCUPÉRATION DES SALONS (REST API)
    // -----------------------------------------------------------------
    async fetchRooms() {
      // Liste de secours si le serveur est éteint (Fallback)
      const defaultRooms = [
        { id: 'general', name: 'Général 💬' },
        { id: 'sport', name: 'Sport ⚽' },
        { id: 'tech', name: 'Tech 💻' },
        { id: 'gaming', name: 'Gaming 🎮' }
      ];

      try {
        console.log("🔍 Récupération des rooms...");
        // On interroge l'API pour avoir les salles actives
        const response = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
        
        // Sécurité : Vérifie si l'API renvoie bien du JSON et pas une erreur HTML
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("HTML reçu au lieu de JSON");
        }

        const json = await response.json();
        let serverRooms: Room[] = [];

        if (json.success && json.data) {
           // Transformation de l'objet API en tableau utilisable
           serverRooms = Object.keys(json.data).map(key => ({ id: key, name: key }));
        }

        // FUSION : On garde nos salles par défaut + celles du serveur
        // Cela garantit que l'interface n'est jamais vide.
        const mergedRooms = [...defaultRooms];
        serverRooms.forEach(srvRoom => {
          // On vérifie les doublons d'ID avant d'ajouter
          if (!mergedRooms.some(r => r.id === srvRoom.id)) mergedRooms.push(srvRoom);
        });

        this.rooms = mergedRooms;

      } catch (e) {
        console.error("⚠️ Erreur API Rooms, utilisation du mode secours:", e);
        this.rooms = defaultRooms;
      }
    },

    // -----------------------------------------------------------------
    // ACTION B : RÉCUPÉRATION DE L'HISTORIQUE (NOUVEAU !)
    // Appelé quand on entre dans une salle pour voir les anciens messages.
    // -----------------------------------------------------------------
    async fetchHistory(roomId: string) {
      // On prépare le tableau vide si nécessaire
      if (!this.messages[roomId]) this.messages[roomId] = [];

      try {
        console.log(`📜 Chargement historique pour : ${roomId}`);
        // Appel API REST pour récupérer les vieux messages
        const response = await fetch(`https://api.tools.gavago.fr/socketio/api/messages/${roomId}`);
        
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            // Pour chaque ancien message reçu, on le traite comme un nouveau
            json.data.forEach((msg: any) => {
               this.processMessage(msg, roomId);
            });
            console.log(`✅ ${json.data.length} anciens messages chargés.`);
          }
        }
      } catch (e) {
        console.warn("Pas d'historique disponible (ou erreur API).");
      }
    },

    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // -----------------------------------------------------------------
    // ACTION C : CONNEXION SOCKET (Temps Réel)
    // C'est ici qu'on gère la réception des messages.
    // -----------------------------------------------------------------
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      // 1. CHARGEMENT HISTORIQUE
      // On demande tout de suite les anciens messages à l'API
      this.fetchHistory(roomName);

      // 2. NETTOYAGE CRITIQUE (ANTI-DOUBLON)
      // Avant de créer un nouvel écouteur, on SUPPRIME les anciens.
      // Sans ça, à chaque visite de page, on crée un écouteur fantôme en plus
      // qui duplique les messages reçus.
      $socket.off('chat-msg'); 
      $socket.off('connect');

      // 3. Connexion
      if (!$socket.connected) {
        $socket.connect();
      }

      // 4. On rejoint la salle
      $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
      this.isConnected = true;

      // 5. ÉCOUTEUR UNIQUE
      // Quand un message arrive du serveur...
      $socket.on('chat-msg', (msg: any) => {
         // On délègue le traitement à une fonction dédiée (plus propre)
         this.processMessage(msg, roomName);
      });
    },

    // -----------------------------------------------------------------
    // FONCTION UTILITAIRE : FORMATAGE DU MESSAGE
    // Sert à nettoyer les données brutes du serveur.
    // -----------------------------------------------------------------
    processMessage(msg: any, defaultRoomId: string) {
       // On ignore les messages techniques
       if (msg.categorie === 'INFO') return;

       // DÉTECTION IMAGE INTELLIGENTE
       // Le serveur ne marque pas toujours bien les images.
       // On regarde si le contenu commence par le code "data:image" (Base64).
       const content = msg.content || '';
       const isImage = msg.categorie === 'NEW_IMAGE' || content.startsWith('data:image');
       
       // On construit un objet Message propre
       const formattedMsg: Message = {
          id: msg.id || Math.random().toString(36), // ID unique
          author: msg.pseudo || msg.userId || 'Inconnu',
          
          // Si c'est une image, on VIDE le texte (sinon ça affiche des hiéroglyphes)
          text: isImage ? '' : content, 
          
          // Si c'est une image, on remplit la propriété photo
          photo: isImage ? content : undefined,
          
          date: msg.dateEmis || new Date().toISOString(),
          roomId: msg.roomName || defaultRoomId,
          isSystem: false
       }

       // On envoie au stockage
       this.handleIncomingMessage(formattedMsg);
    },

    // -----------------------------------------------------------------
    // ACTION D : ENVOI DE MESSAGE
    // -----------------------------------------------------------------
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      const content = photo || text; 

      if (this.isConnected) {
        // On envoie le paquet au serveur
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // ⚠️ STOP DUPLICATION ⚠️
      // Nous n'ajoutons PAS le message localement ici.
      // Nous attendons que le serveur nous le renvoie via 'chat-msg'.
      // Cela garantit que tous les clients sont synchronisés.
    },

    // -----------------------------------------------------------------
    // ACTION E : STOCKAGE ET NOTIFICATIONS
    // -----------------------------------------------------------------
    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // 🛡️ FILTRE ANTI-DOUBLON ULTIME 🛡️
      // On vérifie si un message avec le même ID existe déjà dans la liste.
      const exists = this.messages[roomId].some(m => m.id === msg.id);
      
      if (exists) {
        // Si oui, on arrête tout. On ne l'ajoute pas une 2ème fois.
        return; 
      }

      // Ajout du message
      this.messages[roomId].push(msg);

      // TRI CHRONOLOGIQUE
      // Important car l'historique API peut arriver dans le désordre
      this.messages[roomId].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // GESTION MÉMOIRE (GARBAGE COLLECTION)
      // On ne garde que les 50 derniers messages pour ne pas faire laguer le téléphone
      if (this.messages[roomId].length > 50) {
         this.messages[roomId] = this.messages[roomId].slice(-50);
      }

      // NOTIFICATIONS HARDWARE
      // On vibre/notifie seulement si ce n'est pas moi qui écris
      if (msg.author !== this.currentUser?.username) {
        // Vibration
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch(e){}
        }
        // Notification système
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
           try {
               new Notification(`Message de ${msg.author}`, {
                 body: msg.photo ? '📷 Photo reçue' : msg.text,
                 icon: '/favicon.ico'
               });
           } catch (e) {}
        }
      }
    }
  }
})