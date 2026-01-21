import { describe, it, expect } from 'vitest'
import { useChatStore } from '../../app/stores/chat'

describe('Logique Unitaire', () => {
  it('Doit savoir calculer une addition simple', () => {
    expect(1 + 1).toBe(2)
  })

  // Avant chaque test, on réinitialise Pinia (la mémoire)
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Initialise avec des valeurs vides', () => {
    const store = useChatStore()
    expect(store.isConnected).toBe(false)
    expect(store.messages).toEqual({})
  })

  it('La fonction fixBase64 répare une image sans en-tête', () => {
    const store = useChatStore()
    
    // Cas 1 : Image déjà valide
    const valid = 'data:image/png;base64,AZERTY...'
    expect(store.fixBase64(valid)).toBe(valid)

    // Cas 2 : Image cassée (texte long sans espace)
    // On simule une longue chaine > 500 caractères
    const broken = 'A'.repeat(501) 
    const fixed = store.fixBase64(broken)
    
    // On s'attend à ce qu'il ait ajouté le préfixe
    expect(fixed).toContain('data:image/jpeg;base64,')
  })

  it('Ne doit pas réparer un simple texte court', () => {
    const store = useChatStore()
    const text = 'Salut ça va ?'
    expect(store.fixBase64(text)).toBe(null)
  })

  it('Peut définir un utilisateur', () => {
    const store = useChatStore()
    store.setUser('Toto', 'avatar.jpg')
    
    expect(store.currentUser?.username).toBe('Toto')
    expect(store.currentUser?.photo).toBe('avatar.jpg')
  })
})