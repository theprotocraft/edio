// Message types for chat functionality
export type Message = {
  id: string
  project_id: string
  sender_id: string
  content: string
  type: 'text' | 'system' | 'feedback'
  created_at: string
  sender?: {
    id: string
    name?: string
    email?: string
    avatar_url?: string
  }
}

// Project types
export type ProjectEditor = {
  editor: {
    id: string
    name?: string
    email?: string
  } | null
}

// User types
export type User = {
  id: string
  name?: string
  email: string
  avatar_url?: string
  role: 'youtuber' | 'editor'
}