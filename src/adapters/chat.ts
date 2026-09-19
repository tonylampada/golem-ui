import type { Unsubscribe } from './common'

/** A file carried by a message, or staged in the composer. Name and size only — no bytes. */
export interface ChatAttachment {
  id: string
  name: string
  /** Bytes. Rendered on the chip as `12 KB`; omit it and the chip shows the name alone. */
  size?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  text: string
  at: string
  attachments?: ChatAttachment[]
  /** Omit once confirmed. Pending and failed messages remain in the adapter's complete conversation. */
  delivery?: 'pending' | 'failed'
  /**
   * True while the agent is still writing this message. The adapter emits the same `id` again and
   * again with a longer `text`; the last emission of that id drops the flag, and that is `done`.
   * An empty `text` with the flag set is the agent thinking before its first token.
   */
  streaming?: boolean
}

export interface ChatAdapter {
  history(): Promise<ChatMessage[]>
  send(text: string, attachments?: ChatAttachment[]): Promise<void>
  /** Retries a failed message when the adapter supports retries. */
  retry?(messageId: string): Promise<void>
  /** Stops the reply being written. Chat shows a Stop pill on the thinking row only when this exists. */
  interrupt?(): Promise<void>
  /** Called with the whole conversation on every change, including each token of a stream. */
  subscribe(listener: (messages: ChatMessage[]) => void): Unsubscribe
}
