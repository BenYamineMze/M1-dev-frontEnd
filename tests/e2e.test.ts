// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Test E2E (Navigation)', async () => {
  // Cette commande lance ton vrai serveur Nuxt en arrière-plan
  await setup({
    // ⚠️ IMPORTANT : Vérifie que ton dossier Nuxt est bien dans "app"
    // Si ton fichier nuxt.config.ts est à la racine, mets : rootDir: '.'
    rootDir: './app' 
  })

  it('La page d\'accueil se charge correctement (Status 200)', async () => {
    // Le robot demande la page d'accueil '/'
    const html = await $fetch('/')
    
    // On vérifie que le code HTML reçu contient le titre de ton site
    expect(html).toContain('KARIBU')
  })

  it('La page Room se charge aussi', async () => {
    // Le robot essaie d'aller sur /room/general
    const html = await $fetch('/room/general')
    
    // On vérifie qu'on est bien sur la page de chat (recherche d'un texte unique à cette page)
    expect(html).toContain('En ligne')
  })
})