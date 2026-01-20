import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

// --- DÉFINITION DES TYPES ---
// C'est comme un "contrat". On dit à Typescript à quoi ressemble un Message et une Room.
export type Message = {
  id: string;
  author: string;
  text: string;
  photo?: string;   // Le "?" veut dire "optionnel" (il peut ne pas y avoir de photo)
  date: string;
  roomId?: string;
  isSystem?: boolean;
}

export type Room = {
  id: string;
  name: string;
}

export const useChatStore = defineStore('chat', {
  // --- 1. LE STATE (La Mémoire) ---
  // C'est ici que sont stockées les données tant que l'app est ouverte.
  state: () => ({
    isConnected: false, // Est-on connecté au socket ?
    currentUser: null as { username: string, photo: string } | null, // Qui suis-je ?
    rooms: [] as Room[], // La liste des salons disponibles (Général, Sport...)
    messages: {} as Record<string, Message[]> // Les messages, rangés par ID de room
  }),

  actions: {
    // --- 2. RÉCUPÉRER LES SALONS (API REST) ---
    // Cette fonction est appelée au chargement de la page d'accueil (Reception)
    async fetchRooms() {
      try {
        console.log("🔍 Je demande la liste des rooms au serveur API...");
        
        // On fait une requête HTTP classique (GET) vers l'API du prof
        const response = await fetch('https://api.tools.gavago.fr/api/rooms');
        const json = await response.json();
        
        // Debug : Affiche la réponse brute dans la console (F12) pour vérifier
        console.log("📦 Réponse reçue :", json);

        // Si l'API nous renvoie des données (json.data existe)
        if (json.data) {
           // On transforme l'objet bizarre du serveur en une liste propre pour nous
           this.rooms = Object.keys(json.data).map(key => ({
             id: key,
             name: key 
           }));
        } else {
           // CAS DE SECOURS : Si l'API est vide ou buggée, on force des rooms par défaut
           // pour que l'utilisateur ne se retrouve pas bloqué.
           this.rooms = [
             { id: 'general', name: 'general' },
             { id: 'sport', name: 'sport' },
             { id: 'tech', name: 'tech' }
           ];
        }
      } catch (e) {
        console.error("❌ Erreur réseau :", e);
        // En cas de panne internet, on met au moins "general"
        this.rooms = [{ id: 'general', name: 'general' }];
      }
    },

    // Simple fonction pour enregistrer le pseudo et la photo dans le state
    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // --- 3. CONNEXION AU SOCKET (Le Temps Réel) ---
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp() // On récupère l'outil Socket.io
      const myPseudo = this.currentUser?.username || 'Anonyme'
      
      // Si on est déjà connecté, on demande juste à changer de room (join)
      // sans relancer toute la connexion
      if ($socket.connected) {
         $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
         return;
      }

      // NETTOYAGE IMPORTANT : On supprime toutes les anciennes écoutes
      // C'est ça qui empêche ton appli de planter (le fameux crash "DOM Node")
      $socket.offAny();

      // On lance la connexion
      $socket.connect()

      // Quand la connexion est réussie...
      $socket.on('connect', () => {
        this.isConnected = true
        console.log(`🟢 Connecté ! Je rejoins le salon : ${roomName}`);
        // On dit au serveur : "Je suis là, je m'appelle X et je vais dans la room Y"
        $socket.emit('chat-join-room', { pseudo: myPseudo, roomName })
      })

      // QUAND ON REÇOIT UN MESSAGE DU SERVEUR
      $socket.on('chat-msg', (msg: any) => {
         // Filtre 1 : On ignore les messages techniques "INFO" (ex: "X a rejoint")
         if (msg.categorie === 'INFO') return;

         // Filtre 2 : Est-ce une image ?
         const isImage = msg.categorie === 'NEW_IMAGE';
         
         // On formate le message proprement pour notre application
         const formattedMsg: Message = {
            id: msg.id || Math.random().toString(36), // ID unique
            author: msg.pseudo || msg.userId || 'Inconnu',
            
            // ASTUCE ANTI-BUG D'AFFICHAGE : 
            // Si c'est une image, on force le texte à vide.
            // Sinon, on prend le contenu du message.
            text: isImage ? '' : msg.content, 
            
            // Si c'est une image, on met le contenu (Base64) dans la case photo
            photo: isImage ? msg.content : undefined,
            
            date: msg.dateEmis || new Date().toISOString(),
            roomId: msg.roomName || roomName,
            isSystem: false
         }
         
         // On l'ajoute à notre liste de messages
         this.handleIncomingMessage(formattedMsg)
      })
    },

    // --- 4. ENVOYER UN MESSAGE ---
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      
      // Le contenu c'est soit la photo, soit le texte
      const content = photo || text; 

      if (this.isConnected) {
        // On envoie au serveur
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // ⚠️ MODIFICATION CRITIQUE ICI POUR ÉVITER LES DOUBLONS :
      // Avant, on ajoutait le message localement ici.
      // Maintenant, on ne fait RIEN. 
      // On attend que le serveur nous renvoie le message via "socket.on('chat-msg')" plus haut.
      // Comme ça, on est sûr d'avoir un seul exemplaire du message.
    },

    // --- 5. STOCKER ET AFFICHER LE MESSAGE ---
    handleIncomingMessage(msg: Message) {
      const roomId = msg.roomId || 'general'
      
      // Si la liste de messages pour cette room n'existe pas, on la crée
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // Sécurité : Si le message existe déjà (même ID), on ne l'ajoute pas
      if (this.messages[roomId].some(m => m.id === msg.id)) return;

      // Hop, on ajoute le message à la liste !
      this.messages[roomId].push(msg)

      // NETTOYAGE MÉMOIRE :
      // On ne garde que les 30 derniers messages.
      // Si on en a plus, on coupe les plus vieux.
      // C'est ça qui empêche ton téléphone de laguer au bout de 5 minutes.
      if (this.messages[roomId].length > 30) {
         this.messages[roomId] = this.messages[roomId].slice(-30);
      }

      // VIBRATION :
      // Si ce n'est pas moi qui ai écrit le message, je vibre.
      if (msg.author !== this.currentUser?.username) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch(e){}
        }
      }
    }
  }
})