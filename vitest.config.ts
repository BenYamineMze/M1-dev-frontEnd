import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom', // Simule un navigateur
    globals: true, // Permet d'utiliser describe, it, expect sans les importer
    include: ['tests/unit/**/*.{test,spec}.ts'], // On sépare les tests unitaires
  }
})