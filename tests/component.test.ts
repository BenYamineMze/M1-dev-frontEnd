import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Reception from '../app/pages/reception.vue'

// --- 1. MOCK (SIMULATION) DES OUTILS ---

// On simule le Router
vi.mock('#app', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useNuxtApp: () => ({ $socket: { off: vi.fn(), on: vi.fn(), emit: vi.fn() } })
}))

// On simule le Store Pinia
vi.mock('~/stores/chat', () => ({
  useChatStore: () => ({
    fetchRooms: vi.fn(),
    rooms: [{ id: 'general', name: 'Général' }],
    currentUser: null,
    setUser: vi.fn(),
    connectToServer: vi.fn()
  })
}))

// --- CORRECTION HEURTÉE ICI ---
// On utilise Object.defineProperty pour écraser les propriétés protégées du navigateur

// 1. Mock Caméra
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }] // On simule aussi l'arrêt de la caméra
    })
  },
  writable: true
});

// 2. Mock Géolocalisation
Object.defineProperty(global.navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn()
  },
  writable: true
});

// 3. Mock Batterie
Object.defineProperty(global.navigator, 'getBattery', {
  value: vi.fn(() => Promise.resolve({ level: 1, charging: true })),
  writable: true
});

// --- 2. LE TEST ---
describe('Page d\'accueil (Reception)', () => {
  
  it('Doit afficher le titre KARIBU', () => {
    const wrapper = mount(Reception)
    expect(wrapper.text()).toContain('KARIBU')
  })

  it('Le bouton rejoindre doit être désactivé au début', () => {
    const wrapper = mount(Reception)
    // On cherche le bouton via sa classe
    const button = wrapper.find('button.btn-main')
    // On vérifie qu'il est désactivé (car formulaire vide)
    expect(button.element.disabled).toBe(true)
  })
})