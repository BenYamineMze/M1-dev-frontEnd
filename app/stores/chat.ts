import { defineStore } from 'pinia'
import { useNuxtApp } from '#app'

// =================================================================
// 1. DÉFINITION DES TYPES (Le Contrat de Données)
// =================================================================
// Ces types permettent à TypeScript de vérifier qu'on ne fait pas d'erreurs.
// C'est essentiel pour la maintenabilité du projet.

export type Message = {
  id: string;        // Identifiant unique (UUID) pour éviter les doublons
  author: string;    // Le pseudo de l'utilisateur
  text: string;      // Le contenu textuel (vide si c'est une image)
  photo?: string;    // Le code Base64 de l'image (optionnel)
  date: string;      // Date ISO (ex: 2023-10-25T14:00:00Z) pour le tri
  roomId?: string;   // Pour savoir dans quel salon afficher le message
  isSystem?: boolean; // Pour les messages administratifs (ex: "Bienvenue")
  // --- NOUVEAU POUR LE MODE HORS LIGNE ---
  pending?: boolean; // Si true, le message est en attente d'envoi (icone horloge)
}

export type Room = {
  id: string;
  name: string;
}

// =================================================================
// 2. LE STORE PINIA (Le "Cerveau" de l'application)
// =================================================================
export const useChatStore = defineStore('chat', {
  
  // --- STATE (L'état global) ---
  // C'est ici que sont stockées les données partagées entre toutes les pages.
  state: () => ({
    isConnected: false, // Savoir si le lien avec le serveur est actif
    currentUser: null as { username: string, photo: string } | null, // Profil de l'utilisateur connecté
    rooms: [] as Room[], // La liste des salons disponibles
    // Stockage des messages triés par ID de salon.
    // Ex: messages['sport'] contient tous les messages du sport.
    messages: {} as Record<string, Message[]>,
    
    // --- NOUVEAU : FILE D'ATTENTE HORS LIGNE ---
    // Stocke les messages qui n'ont pas pu partir faute de réseau
    offlineQueue: [] as { roomId: string, content: string }[] 
  }),

  actions: {
    // -----------------------------------------------------------------
    // HELPER : RÉPARATEUR D'IMAGE (Fonction Technique)
    // -----------------------------------------------------------------
    // PROBLÈME : Le serveur renvoie parfois des images brutes sans l'en-tête "data:image...".
    // SOLUTION : Cette fonction détecte ces cas et répare le code Base64 pour que le navigateur l'affiche.
    fixBase64(content: string): string | null {
      if (!content) return null;

      // Cas 1 : L'image est déjà valide (elle commence par l'étiquette standard)
      if (content.startsWith('data:image')) {
        return content;
      }

      // Cas 2 : C'est du Base64 brut (sans étiquette)
      // On utilise une heuristique : si c'est très long (>500 chars) et sans espaces, c'est sûrement une image.
      if (content.length > 500 && !content.includes(' ')) {
        // CORRECTION : On ajoute manuellement l'en-tête manquant
        return `data:image/jpeg;base64,${content}`;
      }

      // Cas 3 : Ce n'est pas une image, c'est du texte normal
      return null;
    },

    // -----------------------------------------------------------------
    // ACTION A : RÉCUPÉRATION DES SALONS (API REST)
    // -----------------------------------------------------------------
    async fetchRooms() {
      // Liste de secours (Fallback) si le serveur est en panne
      const defaultRooms = [
        { id: 'general', name: 'Général 💬' },
        { id: 'sport', name: 'Sport ⚽' },
        { id: 'tech', name: 'Tech 💻' },
        { id: 'gaming', name: 'Gaming 🎮' }
      ];

      try {
        // Appel à l'API pour récupérer les salons actifs
        const response = await fetch('https://api.tools.gavago.fr/socketio/api/rooms');
        const json = await response.json();
        
        let serverRooms: Room[] = [];
        if (json.success && json.data) {
           // Transformation de l'objet API en tableau utilisable
           serverRooms = Object.keys(json.data).map(key => ({ id: key, name: key }));
        }

        // FUSION INTELLIGENTE :
        // On garde nos salons par défaut + ceux du serveur, en évitant les doublons d'ID.
        const mergedRooms = [...defaultRooms];
        serverRooms.forEach(srvRoom => {
          if (!mergedRooms.some(r => r.id === srvRoom.id)) mergedRooms.push(srvRoom);
        });

        this.rooms = mergedRooms;

      } catch (e) {
        console.error("⚠️ Erreur API Rooms, utilisation de la liste par défaut.");
        this.rooms = defaultRooms;
      }
    },

    // Enregistre l'utilisateur dans le store (appelé depuis la page Login)
    setUser(username: string, photo: string) {
      this.currentUser = { username, photo }
    },

    // -----------------------------------------------------------------
    // ACTION B : CHARGEMENT DE L'HISTORIQUE (REST API)
    // -----------------------------------------------------------------
    // Permet de voir les messages envoyés AVANT notre connexion.
    async fetchHistory(roomId: string) {
      // On initialise le tableau si vide
      if (!this.messages[roomId]) this.messages[roomId] = [];

      try {
        console.log(`📜 Récupération historique pour : ${roomId}`);
        const response = await fetch(`https://api.tools.gavago.fr/socketio/api/messages/${roomId}`);
        
        if (response.ok) {
          const json = await response.json();
          if (json.success && Array.isArray(json.data)) {
            // On injecte chaque ancien message dans notre système de traitement
            json.data.forEach((msg: any) => {
               this.processIncomingMessage(msg, roomId);
            });
            console.log(`✅ ${json.data.length} messages d'historique chargés.`);
          }
        }
      } catch (e) {
        console.warn("Historique non disponible (API down ou vide).");
      }
    },

    // -----------------------------------------------------------------
    // ACTION C : CONNEXION SOCKET.IO (Le cœur du Temps Réel)
    // -----------------------------------------------------------------
    connectToServer(roomName: string = 'general') {
      const { $socket } = useNuxtApp()
      const myPseudo = this.currentUser?.username || 'Anonyme'

      // 1. On charge d'abord l'historique via l'API REST
      this.fetchHistory(roomName);

      // --- NOUVEAU : Chargement de la file d'attente sauvegardée ---
      this.loadQueueFromStorage();

      // 2. NETTOYAGE (CRITIQUE POUR ÉVITER LES DOUBLONS)
      // Avant de créer une nouvelle connexion, on supprime TOUS les anciens écouteurs.
      // Si on oublie ça, changer de page crée des écouteurs "fantômes" qui reçoivent les messages en double.
      $socket.off('chat-msg'); 
      $socket.off('connect');
      $socket.off('disconnect'); // Ajout important pour gérer l'état offline

      // 3. Connexion au serveur WebSocket
      if (!$socket.connected) {
        $socket.connect();
      }

      // --- GESTION DES ÉVÉNEMENTS DE CONNEXION ---
      
      $socket.on('connect', () => {
        console.log("🟢 Connecté au serveur !");
        this.isConnected = true;
        
        // On rejoint la room
        $socket.emit('chat-join-room', { pseudo: myPseudo, roomName });
        
        // --- NOUVEAU : DÉCLENCHEUR DE SYNCHRONISATION ---
        // Dès qu'on a internet, on envoie tout ce qui était bloqué
        this.processOfflineQueue();
      });

      $socket.on('disconnect', () => {
        console.log("🔴 Déconnecté du serveur.");
        this.isConnected = false;
      });

      // 5. On écoute les nouveaux messages entrants
      $socket.on('chat-msg', (msg: any) => {
         // On délègue le traitement complexe à une fonction dédiée
         this.processIncomingMessage(msg, roomName);
      });
    },

    // -----------------------------------------------------------------
    // FONCTION : TRAITEMENT DU MESSAGE REÇU
    // -----------------------------------------------------------------
    processIncomingMessage(msg: any, defaultRoomId: string) {
       // On filtre les messages techniques du serveur
       if (msg.categorie === 'INFO') return;

       // DÉTECTION IMAGE : On utilise notre réparateur (fixBase64)
       const validPhoto = this.fixBase64(msg.content);
       
       // Si fixBase64 renvoie quelque chose, c'est une image valide
       const isImage = validPhoto !== null || msg.categorie === 'NEW_IMAGE';
       
       // On normalise le message pour notre application
       const formattedMsg: Message = {
          id: msg.id || Math.random().toString(36), // ID de secours
          author: msg.pseudo || msg.userId || 'Inconnu',
          
          // Si c'est une image, on force le texte à vide pour l'esthétique
          text: isImage ? '' : msg.content, 
          
          // Si c'est une image, on stocke le code Base64 corrigé
          photo: validPhoto || undefined,
          
          date: msg.dateEmis || new Date().toISOString(),
          roomId: msg.roomName || defaultRoomId,
          isSystem: false,
          pending: false // Un message reçu du serveur n'est jamais "en attente"
       }

       // On passe à l'étape de stockage
       this.addMessageToStore(formattedMsg);
    },

    // -----------------------------------------------------------------
    // ACTION : ENVOI DE MESSAGE (MODIFIÉE POUR OFFLINE)
    // -----------------------------------------------------------------
    sendMessage(roomId: string, text: string, photo: string | null = null) {
      const { $socket } = useNuxtApp()
      // On envoie soit le texte, soit la photo
      const content = photo || text; 

      // CAS 1 : ON EST EN LIGNE
      if (this.isConnected) {
        $socket.emit('chat-msg', { content, roomName: roomId })
      }
      
      // CAS 2 : ON EST HORS LIGNE (NOUVELLE APPROCHE)
      else {
        console.log("⚠️ Hors ligne : Mise en file d'attente");
        
        // A. On sauvegarde dans la file d'attente pour plus tard
        this.offlineQueue.push({ roomId, content });
        this.saveQueueToStorage(); 

        // B. OPTIMISTIC UI (Interface Optimiste)
        // On affiche quand même le message tout de suite pour l'utilisateur,
        // mais on le marque comme "pending" (en attente) pour qu'il soit un peu transparent.
        const tempMsg: Message = {
          id: 'temp-' + Date.now(), // ID temporaire local
          author: this.currentUser?.username || 'Moi',
          text: photo ? '' : text,
          photo: photo || undefined,
          date: new Date().toISOString(),
          roomId: roomId,
          pending: true // Marqueur visuel "En attente"
        };
        this.addMessageToStore(tempMsg);
      }
      
      // STRATÉGIE "SERVER AUTHORITY" (Quand on est en ligne) :
      // On n'ajoute PAS le message localement ici (`this.messages.push`).
      // On attend que le serveur nous le renvoie via l'événement 'chat-msg'.
    },

    // -----------------------------------------------------------------
    // NOUVEAU : GESTION DE LA FILE D'ATTENTE (QUEUE)
    // -----------------------------------------------------------------
    processOfflineQueue() {
      const { $socket } = useNuxtApp();
      
      if (this.offlineQueue.length > 0) {
        console.log(`📤 Envoi de ${this.offlineQueue.length} messages en attente...`);
        
        // On envoie chaque message stocké
        this.offlineQueue.forEach(item => {
          $socket.emit('chat-msg', { content: item.content, roomName: item.roomId });
        });
        
        // Une fois envoyés, on vide la file et le stockage
        this.offlineQueue = [];
        this.saveQueueToStorage();
      }
    },

    // Sauvegarde dans le LocalStorage (persistance si on ferme l'appli)
    saveQueueToStorage() {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('chat_queue', JSON.stringify(this.offlineQueue));
      }
    },

    // Restaure depuis le LocalStorage au démarrage
    loadQueueFromStorage() {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('chat_queue');
        if (saved) {
          try {
            this.offlineQueue = JSON.parse(saved);
            console.log(`📂 File d'attente restaurée : ${this.offlineQueue.length} messages.`);
          } catch (e) {
            this.offlineQueue = [];
          }
        }
      }
    },

    // -----------------------------------------------------------------
    // FONCTION : STOCKAGE SÉCURISÉ
    // -----------------------------------------------------------------
    addMessageToStore(msg: Message) {
      const roomId = msg.roomId || 'general'
      
      // Création du tableau s'il n'existe pas
      if (!this.messages[roomId]) this.messages[roomId] = []
      
      // FILTRE ANTI-DOUBLON FINAL :
      // On vérifie si l'ID du message existe déjà dans la liste.
      const exists = this.messages[roomId].some(m => m.id === msg.id);
      if (exists) return; // Si oui, on rejette le message.

      // Ajout
      this.messages[roomId].push(msg);

      // Tri chronologique (le plus vieux en haut, le plus récent en bas)
      this.messages[roomId].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // GARBAGE COLLECTION (Gestion mémoire) :
      // On ne garde que les 50 derniers messages pour ne pas ralentir le téléphone.
      if (this.messages[roomId].length > 50) {
         this.messages[roomId] = this.messages[roomId].slice(-50);
      }
    },

    // -----------------------------------------------------------------
    // ACTION : SUPPRESSION (Pour la Galerie)
    // -----------------------------------------------------------------
    deleteMessage(roomId: string, messageId: string) {
      if (this.messages[roomId]) {
        // On recrée la liste en excluant le message ciblé
        this.messages[roomId] = this.messages[roomId].filter(m => m.id !== messageId);
      }
    }
  }
})