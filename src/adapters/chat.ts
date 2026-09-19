import type { Unsubscribe } from './common'

/** A file carried by a message, or staged in the composer. Name and size only — no bytes. */
export interface ChatAttachment {
  id: string
  name: string
  /** Bytes. Rendered on the chip as `12 KB`; omit it and the chip shows the name alone. */
  size?: number
}

/** One slash command the adapter honours, as the composer's picker lists it. */
export interface ChatCommand {
  /** With its leading slash: `/reset`. */
  name: string
  description: string
  /** The values the command accepts as its single argument, when it takes one. */
  args?: Array<{ value: string; description: string }>
}

export interface ChatMessage {
  id: string
  /** `'system'` is a slash command or its reply: rendered as a dim centred row, never a bubble. */
  role: 'user' | 'agent' | 'system'
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
  /**
   * Source locations the agent drew on, `path#L<start>-L<end>` inside a brain. Chat draws each as a
   * chip under the bubble; clicking one calls `openSource`.
   */
  sources?: string[]
}

export interface ChatAdapter {
  history(): Promise<ChatMessage[]>
  send(text: string, attachments?: ChatAttachment[]): Promise<void>
  /** Retries a failed message when the adapter supports retries. */
  retry?(messageId: string): Promise<void>
  /** Stops the reply being written. Chat shows a Stop pill on the thinking row only when this exists. */
  interrupt?(): Promise<void>
  /** The slash commands the composer completes. With this, a `/` line at the start of the composer opens the picker. */
  commands?(): Promise<ChatCommand[]>
  /** Runs one `/...` line and resolves its reply. Chat renders both as system rows. Unknown names throw. */
  runCommand?(line: string): Promise<string>
  /** Opens a cited source location. The app wires it to `Brain`'s `openLocation`. */
  openSource?(location: string): void
  /** Called with the whole conversation on every change, including each token of a stream. */
  subscribe(listener: (messages: ChatMessage[]) => void): Unsubscribe
}
