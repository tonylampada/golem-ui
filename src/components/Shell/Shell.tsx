import { useEffect, useRef, useState, type ReactNode } from 'react'
import { defineComponent, type GolemProps } from '../../abi'
import type { IdentityAdapter, NavigationAdapter, User } from '../../adapters'
import { shellConfigSchema, type ShellConfig } from './Shell.config'
import { useContainerWidth } from '../../lib/use-container-width'

export interface ShellAdapters {
  identity: IdentityAdapter
  navigation: NavigationAdapter
}

export interface ShellSlots {
  /** The agent conversation. Left empty it renders a placeholder, so the frame is never blank. */
  chat?: ReactNode
  /** The screen the agent built. */
  canvas?: ReactNode
  /**
   * The right-hand end of the top bar — `Auth.AccountMenu` is what usually goes here. Left empty
   * the bar shows the signed-in name as plain text.
   */
  account?: ReactNode
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-400">
      {label}
    </div>
  )
}

function useCurrentUser(identity: IdentityAdapter): User | null {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    let live = true
    void identity.currentUser().then((next) => {
      if (live) setUser(next)
    })
    const unsubscribe = identity.subscribe(setUser)
    return () => {
      live = false
      unsubscribe()
    }
  }, [identity])

  return user
}

const CHAT_WIDTH_KEY = 'golem-shell-chat-width'
const CHAT_MIN = 240
/** The canvas keeps at least this much, however far the chat edge is dragged. */
const CANVAS_MIN = 320

function savedChatWidth(): number {
  try {
    return Number.parseInt(localStorage.getItem(CHAT_WIDTH_KEY) ?? '', 10) || 0
  } catch {
    return 0
  }
}

function ShellFrame({
  config,
  adapters,
  chat,
  canvas,
  account,
}: GolemProps<ShellConfig, ShellAdapters, ShellSlots>) {
  const [tab, setTab] = useState<'chat' | 'canvas'>('chat')
  const root = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(root)
  const isMobile = width < config.breakpoint
  const user = useCurrentUser(adapters.identity)
  const [chatWidth, setChatWidth] = useState(() => savedChatWidth() || config.chatWidth)
  const clampChat = (w: number) =>
    Math.round(Math.min(Math.max(w, CHAT_MIN), Math.max(CHAT_MIN, width - CANVAS_MIN)))

  // The handle sits on the chat column's inner edge; dragging it sets the column's width from the
  // pointer's distance to the frame's chat-side edge. Pointer capture keeps the drag alive when the
  // pointer outruns the 7px handle.
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    const handle = event.currentTarget
    const frame = root.current?.getBoundingClientRect()
    if (!frame) return
    const widthAt = (e: { clientX: number }) =>
      clampChat(config.chatSide === 'left' ? e.clientX - frame.left : frame.right - e.clientX)
    handle.setPointerCapture(event.pointerId)
    const move = (e: PointerEvent) => setChatWidth(widthAt(e))
    const up = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', up)
      try {
        localStorage.setItem(CHAT_WIDTH_KEY, String(widthAt(e)))
      } catch {
        /* private mode: the width lasts the session */
      }
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }
  const resetResize = () => {
    setChatWidth(config.chatWidth)
    try {
      localStorage.removeItem(CHAT_WIDTH_KEY)
    } catch {
      /* nothing saved */
    }
  }

  const chatPane = (
    <div className="h-full min-w-0 overflow-auto">{chat ?? <Placeholder label="agent chat" />}</div>
  )
  const canvasPane = (
    <div className="h-full min-w-0 flex-1 overflow-auto">
      {canvas ?? <Placeholder label="canvas" />}
    </div>
  )

  return (
    <div
      ref={root}
      data-golem-component="Shell"
      data-layout={isMobile ? 'mobile' : 'desktop'}
      className="golem-shell flex h-full min-h-0 w-full flex-col bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100"
    >
      {config.showTopBar && (
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3">
          <button
            type="button"
            onClick={() => adapters.navigation.go('/')}
            className="truncate text-base font-semibold hover:underline"
          >
            {config.title}
          </button>
          {account ??
            (user && <span className="shrink-0 text-sm text-neutral-500 dark:text-neutral-400">{user.name}</span>)}
        </header>
      )}

      {isMobile ? (
        <>
          <div role="tablist" className="flex shrink-0 border-b border-neutral-200 dark:border-neutral-800">
            {(['chat', 'canvas'] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                onClick={() => setTab(name)}
                className={`flex-1 px-4 py-2 text-sm capitalize ${
                  tab === name ? 'border-b-2 border-neutral-900 dark:border-neutral-100 font-medium' : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1">{tab === 'chat' ? chatPane : canvasPane}</div>
        </>
      ) : (
        <div
          className={`flex min-h-0 flex-1 ${
            config.chatSide === 'right' ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <aside
            data-golem-chat-width={clampChat(chatWidth)}
            style={{ width: clampChat(chatWidth) }}
            className={`relative shrink-0 border-neutral-200 dark:border-neutral-800 ${
              config.chatSide === 'left' ? 'border-r' : 'border-l'
            }`}
          >
            {chatPane}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize chat"
              title="Drag to resize, double-click to reset"
              onPointerDown={startResize}
              onDoubleClick={resetResize}
              className={`absolute top-0 bottom-0 z-10 w-[7px] cursor-col-resize touch-none hover:bg-sky-500/35 active:bg-sky-500/35 ${
                config.chatSide === 'left' ? '-right-[3px]' : '-left-[3px]'
              }`}
            />
          </aside>
          {canvasPane}
        </div>
      )}
    </div>
  )
}

export const Shell = defineComponent<typeof shellConfigSchema, ShellAdapters, ShellSlots>({
  name: 'Shell',
  schema: shellConfigSchema,
  render: ShellFrame,
})
