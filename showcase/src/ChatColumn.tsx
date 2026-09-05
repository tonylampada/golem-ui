import { useEffect, useRef, useState } from 'react'
import type { ChatAdapter, ChatMessage } from 'golem-ui'

/**
 * Placeholder for the Chat component, ported from Bridge Commander. It already runs on the real
 * `Chat` adapter, so the swap is markup only.
 */
export function ChatColumn({ adapter }: { adapter: ChatAdapter }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const bottom = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let live = true
    void adapter.history().then((next) => {
      if (live) setMessages(next)
    })
    const unsubscribe = adapter.subscribe(setMessages)
    return () => {
      live = false
      unsubscribe()
    }
  }, [adapter])

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    void adapter.send(text)
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-neutral-50">
      <div className="min-h-0 flex-1 space-y-3 overflow-auto p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto bg-neutral-900 text-white'
                : 'border border-neutral-200 bg-white text-neutral-800'
            }`}
          >
            {message.text}
          </div>
        ))}
        <div ref={bottom} />
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-neutral-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask the agent…"
          aria-label="Message the agent"
          className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-2.5 text-base"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white"
        >
          Send
        </button>
      </form>
    </div>
  )
}
