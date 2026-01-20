// plugins/socket.client.ts
import { defineNuxtPlugin } from '#app'
import { io, Socket } from 'socket.io-client'

export default defineNuxtPlugin((nuxtApp) => {
  // 1. Récupération de l'URL du serveur (à mettre dans tes variables d'env plus tard)
  // Remplace par l'URL fournie par ton prof dans l'énoncé Objectif 2
  const SOCKET_URL = 'https://api.tools.gavago.fr' 

  // 2. Création de la connexion
  const socket: Socket = io(SOCKET_URL, {
    autoConnect: false, // On ne connecte pas tout de suite (attendre que l'user se logue ?)
    transports: ['websocket'] // Force le websocket pour la performance
  })

  // 3. Injection dans l'application
  // Cela te permet d'utiliser $socket partout dans tes pages
  return {
    provide: {
      socket: socket
    }
  }
})