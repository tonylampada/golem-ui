import type { ChatAdapter, ChatMessage } from '../chat'
import { createEmitter } from './emitter'

export function fakeChat(initial: ChatMessage[] = []): ChatAdapter {
  const messages = [...initial]
  const emitter = createEmitter<ChatMessage[]>()
  let nextId = initial.length + 1

  return {
    async history() {
      return [...messages]
    },
    async send(text: string) {
      messages.push({
        id: `fake-msg-${nextId++}`,
        role: 'user',
        text,
        at: new Date(0).toISOString(),
      })
      emitter.emit([...messages])
    },
    subscribe: emitter.subscribe,
  }
}
