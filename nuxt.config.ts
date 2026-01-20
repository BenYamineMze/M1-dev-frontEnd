// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@vite-pwa/nuxt'
  ],

  typescript: {
    strict: true
  },

  // 1. Configuration PWA Avancée
  pwa: {
    registerType: 'autoUpdate', // Mise à jour immédiate (pratique pour le TP)
    
    // Configuration du Manifeste (Apparence sur le téléphone)
    manifest: {
      name: 'Chat PWA TP',
      short_name: 'ChatApp',
      description: 'Application de chat PWA avec Camera et Socket.IO',
      theme_color: '#2563eb',
      background_color: '#ffffff',
      display: 'standalone', // Enlève la barre d'URL du navigateur
      orientation: 'portrait', // Force le mode portrait (style app mobile)
      lang: 'fr',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },

    // Configuration Workbox (Service Worker & Cache)
    workbox: {
      // Quels fichiers mettre en cache ? (HTML, JS, CSS, Images)
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      
      // IMPORTANT : Ne pas mettre en cache les appels Socket.IO
      // Sinon ton chat ne marchera pas
      //,navigateFallback: '/',
      navigateFallback: null,
    },

    // IMPORTANT : Permet de tester la PWA en local (npm run dev)
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true,
    }
  },

  // 2. Configuration Serveur pour le dev (Accès depuis le téléphone)
  devServer: {
    host: '0.0.0.0', // Permet d'accéder au site depuis ton IP locale (ex: 192.168.1.15:3000)
    port: 3000
  },

  css: ['@/assets/css/style.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})