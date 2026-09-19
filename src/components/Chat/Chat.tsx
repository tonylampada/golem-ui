import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { ChatAdapter, ChatAttachment, ChatMessage } from '../../adapters'
import { chatConfigSchema, type ChatConfig } from './Chat.config'
import { Markdown } from '../../lib/markdown'

export interface ChatAdapters {
  chat: ChatAdapter
}

export interface ChatSlots {
  /**
   * Replaces the built-in attach button and the staged-chip row above the composer. It is handed
   * `stage`, which is what the composer sends with the next message; `Upload.Picker` is what
   * belongs here, so an attachment comes from a real upload rather than a name and a size.
   */
  attach?: (stage: (attachments: ChatAttachment[]) => void) => ReactNode
}

/** How close to the bottom still counts as "reading the newest message". */
const PIN_SLACK = 48

function useConversation(adapter: ChatAdapter): { messages: ChatMessage[]; loadError: string } {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadError, setLoadError] = useState<{ adapter: ChatAdapter; message: string } | null>(null)

  useEffect(() => {
    let live = true
    let receivedUpdate = false
    const unsubscribe = adapter.subscribe((next) => {
      receivedUpdate = true
      setLoadError(null)
      setMessages(next)
    })
    void adapter
      .history()
      .then((next) => {
        if (live && !receivedUpdate) {
          setLoadError(null)
          setMessages(next)
        }
      })
      .catch((error: unknown) => {
        if (live)
          setLoadError({
            adapter,
            message: error instanceof Error ? error.message : 'Conversation could not be loaded.',
          })
      })
    return () => {
      live = false
      unsubscribe()
    }
  }, [adapter])

  return { messages, loadError: loadError?.adapter === adapter ? loadError.message : '' }
}

/**
 * The message list follows the newest message only while the reader is already at the bottom.
 * Scroll up to read something and the list stays where it was put, however fast the stream runs.
 */
function useStickToBottom(dependency: unknown) {
  const feed = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)

  const onScroll = () => {
    const element = feed.current
    if (!element) return
    pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < PIN_SLACK
  }

  useLayoutEffect(() => {
    const element = feed.current
    if (element && pinned.current) element.scrollTop = element.scrollHeight
  }, [dependency])

  return { feed, onScroll }
}

/** Timestamps are read straight off the ISO string, so a bubble reads the same in every timezone. */
function hhmm(at: string): string {
  const match = /T(\d{2}:\d{2})/.exec(at)
  return match ? match[1]! : ''
}

function sizeLabel(bytes: number | undefined): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentChips({
  attachments,
  onRemove,
}: {
  attachments: ChatAttachment[]
  onRemove?: (id: string) => void
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((file) => (
        <span
          key={file.id}
          data-golem-chat-attachment={file.name}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-(--chat-line2) bg-(--chat-panel2) px-2 py-0.5 text-xs text-(--chat-dim)"
        >
          <span aria-hidden="true">📄</span>
          <span className="truncate">{file.name}</span>
          {file.size != null && <span className="shrink-0 opacity-60">{sizeLabel(file.size)}</span>}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(file.id)}
              aria-label={`Remove ${file.name}`}
              className="shrink-0 opacity-60 hover:opacity-100"
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

function Bubble({
  message,
  config,
  onRetry,
}: {
  message: ChatMessage
  config: ChatConfig
  onRetry?: (messageId: string) => void
}) {
  const mine = message.role === 'user'
  const pending = message.delivery === 'pending'
  const failed = message.delivery === 'failed'
  const [copied, setCopied] = useState(false)
  const copy = () => {
    void navigator.clipboard?.writeText(message.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div
        data-golem-chat-message={message.role}
        data-streaming={message.streaming ? 'true' : undefined}
        data-delivery={message.delivery}
        className={`group relative max-w-[88%] min-w-0 rounded-xl border px-[13px] py-[9px] text-[15px] leading-normal break-words animate-[golem-chat-in_180ms_ease-out] ${
          mine
            ? 'rounded-br-[4px] border-(--chat-user-line) bg-(--chat-user)'
            : 'rounded-bl-[4px] border-(--chat-line) bg-(--chat-panel)'
        } ${pending ? 'opacity-55' : ''} ${failed ? 'border-(--chat-danger)' : ''}`}
      >
        {/* The reader's own text is never markdown: they typed characters, not a document. */}
        {config.markdown && !mine ? (
          <Markdown text={message.text} />
        ) : (
          <p className="whitespace-pre-wrap">{message.text}</p>
        )}
        {message.streaming && message.text && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-current align-baseline" />
        )}
        {message.attachments?.length ? <AttachmentChips attachments={message.attachments} /> : null}
        {config.showTimestamps && (
          <span className="mt-1 block font-mono text-[11px] text-(--chat-faint)">
            {mine ? config.userName : config.agentName} · {hhmm(message.at)}
          </span>
        )}
        {/* The copy chip shows on hover (always, faintly, on touch), and confirms with a tick. */}
        {message.text && (
          <button
            type="button"
            onClick={copy}
            title="Copy message text"
            aria-label="Copy message text"
            className={`absolute right-1 bottom-[3px] rounded-md border px-[5px] py-px text-xs leading-none transition-opacity focus-visible:opacity-85 group-hover:opacity-85 hover:opacity-100 [@media(hover:none)]:opacity-60 ${
              copied
                ? 'border-(--chat-ok) text-(--chat-ok) opacity-100'
                : 'border-(--chat-line) bg-(--chat-panel2) text-(--chat-dim) opacity-0'
            }`}
          >
            {copied ? '✓' : '⧉'}
          </button>
        )}
      </div>
      {mine && pending && (
        <span role="status" className="mt-0.5 px-1 font-mono text-[11px] text-(--chat-faint)">
          Sending
        </span>
      )}
      {mine && failed && (
        <span className="mt-0.5 flex items-center gap-2 px-1 text-xs text-(--chat-danger)">
          <span role="status">Not sent</span>
          {onRetry && (
            <button type="button" className="underline" onClick={() => onRetry(message.id)}>
              Retry
            </button>
          )}
        </span>
      )}
    </div>
  )
}

function Thinking({ name, onStop }: { name: string; onStop?: () => Promise<void> }) {
  const [stopping, setStopping] = useState(false)
  return (
    <div
      data-golem-chat-thinking="true"
      role="status"
      className="flex w-fit items-center gap-1 rounded-xl rounded-bl-[4px] border border-(--chat-line) bg-(--chat-panel) px-[13px] py-[9px] animate-[golem-chat-in_180ms_ease-out]"
    >
      {[0, 200, 400].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 rounded-full bg-(--chat-dim) animate-[golem-chat-blink_1.2s_infinite]"
        />
      ))}
      <span className="ml-1 text-[11px] text-(--chat-faint)">{name} is thinking…</span>
      {onStop && (
        <button
          type="button"
          disabled={stopping}
          aria-label="Stop the agent"
          onClick={() => {
            setStopping(true)
            void onStop().finally(() => setStopping(false))
          }}
          className="ml-2 rounded-full border border-(--chat-line) bg-(--chat-panel2) px-2 py-0.5 text-[11px] font-medium text-(--chat-danger) transition-colors hover:border-(--chat-danger) disabled:opacity-50"
        >
          Stop
        </button>
      )}
    </div>
  )
}

function ChatPanel({ config, adapters, attach }: GolemProps<ChatConfig, ChatAdapters, ChatSlots>) {
  const { messages, loadError } = useConversation(adapters.chat)
  const [draft, setDraft] = useState('')
  const [staged, setStaged] = useState<ChatAttachment[]>([])
  // Bumped on every send, so a hosted picker remounts with nothing on it: the files went with the
  // message, and its chips would otherwise say they are still waiting to be sent.
  const [sent, setSent] = useState(0)
  const [sendError, setSendError] = useState('')
  const composer = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // A message with no text yet is the agent taking its turn, and the thinking row says so better
  // than an empty bubble would.
  const visible = messages.filter((message) => message.text || message.attachments?.length)
  const last = messages[messages.length - 1]
  const thinking = Boolean(
    last && ((last.role === 'user' && !last.delivery) || (last.streaming && !last.text)),
  )

  const { feed, onScroll } = useStickToBottom(
    `${visible.length}:${last?.text.length ?? 0}:${thinking}`,
  )

  useLayoutEffect(() => {
    const element = composer.current
    if (!element) return
    element.style.height = 'auto'
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 20
    const max = lineHeight * config.maxComposerLines
    element.style.height = `${Math.min(element.scrollHeight, max)}px`
    element.style.overflowY = element.scrollHeight > max ? 'auto' : 'hidden'
  }, [draft, config.maxComposerLines])

  const send = () => {
    const text = draft.trim()
    if (!text && staged.length === 0) return
    setDraft('')
    setStaged([])
    setSent((count) => count + 1)
    setSendError('')
    void adapters.chat.send(text, staged.length ? staged : undefined).catch((error: unknown) => {
      setSendError(error instanceof Error ? error.message : 'Message could not be sent.')
    })
  }

  const retry = adapters.chat.retry
    ? (messageId: string) => {
        setSendError('')
        void adapters.chat.retry!(messageId).catch((error: unknown) => {
          setSendError(error instanceof Error ? error.message : 'Message could not be sent.')
        })
      }
    : undefined

  const interrupt = adapters.chat.interrupt
    ? () => {
        setSendError('')
        return adapters.chat.interrupt!().catch((error: unknown) => {
          setSendError(error instanceof Error ? error.message : 'The agent could not be stopped.')
        })
      }
    : undefined

  return (
    <div
      data-golem-component="Chat"
      className="golem-chat flex h-full min-h-0 w-full flex-col bg-(--chat-bg) text-(--chat-text)"
    >
      <div
        ref={feed}
        onScroll={onScroll}
        role="log"
        aria-label="Conversation"
        aria-live="polite"
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3.5 [scrollbar-color:var(--chat-line2)_transparent] [scrollbar-width:thin]"
      >
        {visible.length === 0 && !thinking ? (
          <p className="flex h-full items-center justify-center p-6 text-center text-sm text-(--chat-faint)">
            {config.emptyState}
          </p>
        ) : (
          visible.map((message) => (
            <Bubble key={message.id} message={message} config={config} onRetry={retry} />
          ))
        )}
        {thinking && <Thinking name={config.agentName} onStop={interrupt} />}
      </div>

      {(loadError || sendError) && (
        <p
          role="alert"
          className="shrink-0 border-t border-(--chat-line) px-3 py-2 text-sm text-(--chat-danger)"
        >
          {loadError || sendError}
        </p>
      )}

      {attach ? (
        <div
          key={sent}
          className="shrink-0 border-t border-(--chat-line) px-3 pt-2"
        >
          {attach(setStaged)}
        </div>
      ) : (
        staged.length > 0 && (
          <div className="shrink-0 border-t border-(--chat-line) px-3 pt-2">
            <AttachmentChips
              attachments={staged}
              onRemove={(id) => setStaged((files) => files.filter((file) => file.id !== id))}
            />
          </div>
        )
      )}

      <form
        className="flex shrink-0 items-end gap-2 border-t border-(--chat-line) px-3 py-2.5"
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
      >
        {!attach && (
          <>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              aria-label="Attach files"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])].map((file, index) => ({
                  id: `att-${Date.now()}-${index}`,
                  name: file.name,
                  size: file.size,
                }))
                setStaged((current) => [...current, ...files])
                event.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              title="Attach a file"
              aria-label="Attach a file"
              className="flex size-[34px] shrink-0 items-center justify-center rounded-full border border-(--chat-line) bg-(--chat-panel2) text-[15px] text-(--chat-dim) transition-colors hover:border-(--chat-accent) hover:text-(--chat-text)"
            >
              📎
            </button>
          </>
        )}
        <textarea
          ref={composer}
          rows={1}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends because the composer is a chat line, not a document; Shift+Enter is the
            // deliberate line break. `isComposing` guards an IME candidate being accepted.
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              send()
            }
          }}
          placeholder={config.placeholder}
          aria-label={config.placeholder}
          className="min-w-0 flex-1 resize-none rounded-[10px] border border-(--chat-line) bg-(--chat-panel) px-3 py-2 text-[15px] leading-6 text-(--chat-text) outline-none transition-[border-color,box-shadow] placeholder:text-(--chat-faint) focus:border-(--chat-accent) focus:shadow-[0_0_0_3px_var(--chat-accent-soft)]"
        />
        <button
          type="submit"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-(--chat-accent) text-sm font-medium text-white transition-opacity hover:opacity-85"
        >
          <span aria-hidden="true">➤</span>
          <span className="sr-only">Send</span>
        </button>
      </form>
    </div>
  )
}

export const Chat = defineComponent<typeof chatConfigSchema, ChatAdapters, ChatSlots>({
  name: 'Chat',
  schema: chatConfigSchema,
  render: ChatPanel,
})
