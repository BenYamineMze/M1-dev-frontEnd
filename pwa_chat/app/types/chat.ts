// types/chat.ts
export type Message = {
  id: string
  roomId: string
  author: string
  text?: string
  photoDataUrl?: string // base64 data URL stockée dans localStorage
  createdAt: string
}

export type Room = {
  id: string
  title: string
  participants: string[] // pseudos
  createdAt: string
}
