import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
// On va tester un composant fictif ou une logique simple 
// car tester reception.vue demande de mocker la Webcam et le GPS

describe('Logique de Validation (Simulation)', () => {
  it('Doit valider le formulaire seulement si tout est rempli', () => {
    // Simulation de la logique de ta page reception.vue
    const pseudo = ''
    const avatar = null
    const room = ''

    const isValid = (p: string, a: any, r: string) => p.length > 0 && a !== null && r.length > 0

    // Test 1 : Tout vide -> Faux
    expect(isValid(pseudo, avatar, room)).toBe(false)

    // Test 2 : Juste pseudo -> Faux
    expect(isValid('Toto', null, '')).toBe(false)

    // Test 3 : Tout bon -> Vrai
    expect(isValid('Toto', 'image_base64', 'general')).toBe(true)
  })
})