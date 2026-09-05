import type { Unsubscribe } from './common'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  at: string
}

export interface ChatAdapter {
  history(): Promise<ChatMessage[]>
  send(text: string): Promise<void>
  subscribe(listener: (messages: ChatMessage[]) => void): Unsubscribe
}
