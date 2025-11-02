import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    pseudo: null as string | null,
    avatar: null as string | null,
  }),

  actions: {
    init() {
      // ⚠️ exécuter uniquement côté client
      if (process.client) {
        this.pseudo = localStorage.getItem('user.pseudo')
        this.avatar = localStorage.getItem('user.avatar')
      }
    },

    setPseudo(p: string) {
      this.pseudo = p
      if (process.client) localStorage.setItem('user.pseudo', p)
    },

    setAvatar(dataUrl: string) {
      this.avatar = dataUrl
      if (process.client) localStorage.setItem('user.avatar', dataUrl)
    },
  },
})
