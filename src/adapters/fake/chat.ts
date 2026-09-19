import type { ChatAdapter, ChatAttachment, ChatCommand, ChatMessage } from '../chat'
import { createEmitter } from './emitter'

export interface FakeChatOptions {
  /** Answered in order, one per send, looping when they run out. Empty means the agent stays mute. */
  replies?: string[]
  /** Milliseconds between tokens. Stories want it slow enough to watch, tests want it near zero. */
  tokenDelayMs?: number
  /** Slash commands the composer completes. `/reset` clears the conversation; any other replies with the line it ran. */
  commands?: ChatCommand[]
}

const DEFAULT_REPLIES = [
  'Noted. Writing that down now.',
  'Done — take a look at the canvas.',
  'Understood. Anything else you want changed?',
]

/**
 * The in-memory Chat adapter. `send` echoes the message, then streams the next canned reply word by
 * word under one message id, so a component's streaming path is exercised without a backend.
 */
export function fakeChat(initial: ChatMessage[] = [], options: FakeChatOptions = {}): ChatAdapter {
  const replies = options.replies ?? DEFAULT_REPLIES
  const tokenDelayMs = options.tokenDelayMs ?? 60
  const messages = [...initial]
  const emitter = createEmitter<ChatMessage[]>()
  let nextId = initial.length + 1
  let sent = 0

  const emit = () => emitter.emit(messages.map((message) => ({ ...message })))

  const stream = (reply: string) => {
    const id = `fake-msg-${nextId++}`
    const at = new Date().toISOString()
    const words = reply.split(' ')
    // The thinking bubble: the message exists with no text yet, so the reader sees the agent take
    // the turn before the first word lands.
    messages.push({ id, role: 'agent', text: '', at, streaming: true })
    emit()

    let written = 0
    const tick = () => {
      written += 1
      const index = messages.findIndex((message) => message.id === id)
      if (index < 0) return
      messages[index] = {
        id,
        role: 'agent',
        at,
        text: words.slice(0, written).join(' '),
        streaming: written < words.length,
      }
      emit()
      if (written < words.length) setTimeout(tick, tokenDelayMs)
    }
    setTimeout(tick, tokenDelayMs)
  }

  return {
    async history() {
      return messages.map((message) => ({ ...message }))
    },
    async send(text: string, attachments?: ChatAttachment[]) {
      messages.push({
        id: `fake-msg-${nextId++}`,
        role: 'user',
        text,
        at: new Date().toISOString(),
        ...(attachments?.length ? { attachments } : {}),
      })
      emit()
      if (replies.length) stream(replies[sent++ % replies.length]!)
    },
    subscribe: emitter.subscribe,
    ...(options.commands
      ? {
          async commands() {
            return options.commands!
          },
          async runCommand(line: string) {
            const [name = '', ...rest] = line.trim().split(/\s+/)
            const command = options.commands!.find((c) => c.name === name)
            if (!command) throw new Error(`Unknown command: ${name}`)
            const arg = rest.join(' ')
            if (command.args?.length && !command.args.some((a) => a.value === arg))
              throw new Error(
                `${name} needs one of: ${command.args.map((a) => a.value).join(', ')}`,
              )
            if (name === '/reset') {
              messages.length = 0
              emit()
              return 'Conversation cleared.'
            }
            return `Ran ${line.trim()}.`
          },
        }
      : {}),
  }
}
