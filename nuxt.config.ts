// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@pinia/nuxt',
    '@vite-pwa/nuxt'
  ],
  typescript: {
    strict: true
  },
  vite: {
    // si besoin, config Vite
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Chat PWA',
      short_name: 'ChatApp',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#2563eb',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    workbox: {
      runtimeCaching: [
        { urlPattern: /^https:\/\/your-api\.com\//, handler: 'NetworkFirst' },
      ]
    }
  },

  css: ['@/assets/css/style.css'],

  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
