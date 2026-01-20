import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

// =================================================================
// 1. DÉFINITION DES TYPES (TypeScript)
// =================================================================
// C'est le "contrat" de données. On explique à l'application 
// à quoi ressemble exactement un Message et une Room.
export type Message = {
  id: string;        // Identifiant unique du message
  author: string;    // Le pseudo de l'auteur
  text: string;      // Le contenu textuel (vide si c'est une image)
  photo?: string;    // L'image en Base64 (optionnel, d'où le "?")
  date: string;      // Date d'envoi ISO
  roomId?: string;   // ID du salon concerné
  isSystem?: boolean; // Est-ce un message système ? (ex: "Bienvenue")
}

export type Room = {
  id: string;
  name: string;
}

// =================================================================
// 2. LE STORE PINIA (Le Cerveau de l'App)
// =================================================================
export const useChatStore = defineStore('chat', {
  
  // --- STATE (L'état/La mémoire) ---
  // C'est ici que sont stockées les données tant que l'utilisateur est sur le site.
  state: () => ({
    isConnected: false, // Variable pour savoir si le Socket est actif
    currentUser: null as { username: string, photo: string } | null, // Profil de l'utilisateur
    rooms: [] as Room[], // Liste des salons (Général, Sport, etc.)
    messages: {} as Record<string, Message[]> // Stockage des messages triés par ID de room
  }),

  actions: {
    // -----------------------------------------------------------------
    // ACTION A : RÉCUPÉRATION DES SALONS (API REST)
    // Appelé au chargement de la page d'accueil.
    // -----------------------------------------------------------------
    async fetchRooms() {
      // Liste de secours en dur, au cas où le serveur API est en panne
      const defaultRooms = [
        { id: 'general', name: 'Général 💬' },
        { id: 'sport', name: 'Sport ⚽' },
        { id: 'music', name: 'Musique 🎵' },
        { id: 'tech', name: 'Tech 💻' },
        { id: 'gaming', name: 'Gaming 🎮' }
      ];

      try {
        console.log("🔍 Tentative de récupération des rooms...");
        
        // 1. Requête HTTP vers l'API du professeur
        // Note : On utilise l'URL correcte identifiée (avec /socketio/api)
        // - L'URL correcte pour l'API est confirmée comme étant https://api.tools.gavago.fr/socketio/api/rooms
        const response = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
        
        // 2. SÉCURITÉ : Vérification du type de contenu
        // Parfois l'API renvoie une page d'erreur HTML (404) au lieu du JSON.
        // On vérifie les headers pour ne pas faire planter l'appli.
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("Format invalide : Le serveur a renvoyé du HTML au lieu du JSON");
        }

        // 3. Conversion de la réponse en objet JS
        const json = await response.json();
        console.log("📦 Réponse API reçue :", json);

        let serverRooms: Room[] = [];

        // 4. Transformation des données
        // L'API renvoie un objet { "general": {}, "sport": {} ... }
        // On le transforme en tableau [{ id: "general", name: "general" }, ...]
        if (json.success && json.data) {
           serverRooms = Object.keys(json.data).map(key => ({
             id: key,
             name: key 
           }));
        }

        // 5. FUSION (Merge)
        // On combine nos rooms par défaut avec celles récupérées du serveur.
        // Cela garantit que l'utilisateur a toujours du choix.
        const mergedRooms = [...defaultRooms];
        serverRooms.forEach(srvRoom => {
          // On évite les doublons : si la room existe déjà, on ne l'ajoute pas
          const exists = mergedRooms.some(r => r.id === srvRoom.id);
          if (!exists) mergedRooms.push(srvRoom);
        });

        this.rooms = mergedRooms;

      } catch (e) {
        // En cas d'erreur (pas d'internet, serveur HS), on utilise la liste par défaut
        console.error("❌ Erreur Rooms (Utilisation secours):", e);
        this.rooms = defaultRooms;
      }
    },

    // Simple setter pour enregistrer le pseudo et l'avatar
    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // -----------------------------------------------------------------
    // ACTION B : CONNEXION SOCKET.IO (Temps Réel)
    // Appelé quand l'utilisateur clique sur "Rejoindre le chat".
    // -----------------------------------------------------------------
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp() // On récupère l'instance du plugin Socket.io
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      // NETTOYAGE CRITIQUE : On supprime les anciens écouteurs pour éviter les doublons d'événements.
      // Si on ne fait pas ça, changer de room crée des écouteurs multiples.
      $socket.offAny(); 
      
      // Si le socket n'est pas connecté, on le connecte
      if (!$socket.connected) {
        $socket.connect()
      }

      // On rejoint la room immédiatement
      // Note: emit peut être fait même si on est déjà connecté
      $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
      this.isConnected = true;
      console.log(`🟢 Connecté au serveur ! Room cible : ${roomName}`);

      // Événement : Réception d'un message
      $socket.on('chat-msg', (msg: any) => {
         // Filtre : On ignore les messages techniques du serveur
         if (msg.categorie === 'INFO') return;

         // LOGIQUE INTELLIGENTE POUR LES IMAGES :
         // Le serveur ne classe pas toujours bien les images.
         // On vérifie nous-même si le contenu commence par "data:image" (format Base64).
         const content = msg.content || '';
         const isImage = msg.categorie === 'NEW_IMAGE' || content.startsWith('data:image');
         
         // On formate le message pour qu'il soit propre
         const formattedMsg: Message = {
            id: msg.id || Math.random().toString(36), // ID unique de secours
            author: msg.pseudo || msg.userId || 'Inconnu',
            
            // ASTUCE AFFICHAGE :
            // Si c'est une image, on vide le champ 'text' pour ne pas afficher le code bizarre.
            text: isImage ? '' : content, 
            
            // Si c'est une image, on remplit le champ 'photo'.
            photo: isImage ? content : undefined,
            
            date: msg.dateEmis || new Date().toISOString(),
            roomId: msg.roomName || roomName,
            isSystem: false
         }
         
         // On délègue le stockage à une autre fonction
         this.handleIncomingMessage(formattedMsg)
      })
    },

    // -----------------------------------------------------------------
    // ACTION C : ENVOI DE MESSAGE
    // -----------------------------------------------------------------
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      // Le contenu est soit le texte, soit la photo (Base64)
      const content = photo || text; 

      if (this.isConnected) {
        // Envoi au serveur via Socket.IO
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // NOTE IMPORTANTE SUR LES DOUBLONS :
      // Nous n'ajoutons PAS le message localement ici (`this.messages.push`).
      // Nous attendons que le serveur nous le renvoie via l'événement 'chat-msg' (plus haut).
      // Cela garantit que tout le monde a reçu le message et évite de l'afficher deux fois.
    },

    // -----------------------------------------------------------------
    // ACTION D : TRAITEMENT ET STOCKAGE
    // Gère l'ajout dans la liste, la limite de mémoire et les notifications.
    // -----------------------------------------------------------------
    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      
      // Si la liste pour cette room n'existe pas encore, on la crée
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // Sécurité anti-doublon : Si l'ID existe déjà, on arrête tout
      if (this.messages[roomId].some(m => m.id === msg.id)) return;

      // Ajout du message à la fin de la liste
      this.messages[roomId].push(msg)

      // GESTION MÉMOIRE :
      // On ne garde que les 30 derniers messages pour ne pas ralentir le navigateur.
      if (this.messages[roomId].length > 30) {
         this.messages[roomId] = this.messages[roomId].slice(-30);
      }

      // NOTIFICATIONS ET VIBRATION :
      // On ne notifie que si le message vient de QUELQU'UN D'AUTRE.
      if (msg.author !== this.currentUser?.username) {
        
        // 1. API Hardware Vibration (Si supporté par le téléphone)
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch(e){}
        }
        
        // 2. API Notification Système (Windows/Android/Mac)
        // Vérifie si l'utilisateur a donné la permission
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
           try {
               new Notification(`Message de ${msg.author}`, {
                 body: msg.photo ? '📷 A envoyé une photo' : msg.text,
                 icon: '/favicon.ico'
               });
           } catch (e) { /* Erreur silencieuse */ }
        }
      }
    }
  }
})