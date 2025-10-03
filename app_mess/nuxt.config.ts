// https://nuxt.com/docs/api/configuration/nuxt-config
/*export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
*/
export default defineNuxtConfig({
  modules: ['@vite-pwa/nuxt'],
  pwa: {
    manifest: {
      name: 'app message',
      short_name: 'chat',
      description: 'application de messagerie instantanée',
      theme_color: '#4A90E2',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
      ]
    },
    registerType: 'autoUpdate',
    workbox: {
      navigateFallback: '/',
    }
  }
})

