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
  /** The agent conversation. Left empty it renders a placeholder, so the frame is never blank; `null` means no chat at all, and no chat toggle. */
  chat?: ReactNode | null
  /** The screen the agent built. */
  canvas?: ReactNode
  /**
   * The right-hand end of the top bar — `Auth.AccountMenu` is what usually goes here. Left empty
   * the bar shows the signed-in name as plain text.
   */
  account?: ReactNode
  /** Extra rows in the settings dropdown, under the theme toggle. `Shell.Setting` is the row. */
  settings?: ReactNode
  /** Called with the item's id when a menu item without `href` is tapped. */
  onSelect?: (id: string) => void
}

function Placeholder({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-(--chat-faint)">
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
const CHAT_OPEN_KEY = 'golem-shell-chat-open'
const THEME_KEY = 'golem-shell-theme'
const CHAT_MIN = 240
/** The canvas keeps at least this much, however far the chat edge is dragged. */
const CANVAS_MIN = 320

function saved(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function save(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* private mode: the choice lasts the session */
  }
}

type Theme = 'light' | 'dark'

/**
 * The kit's theme is the `data-golem-theme` attribute on the document. Shell owns it: the saved
 * choice, else the OS preference, written to the document so every component's `dark:` follows.
 */
function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const kept = saved(THEME_KEY)
    if (kept === 'light' || kept === 'dark') return kept
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  })
  useEffect(() => {
    document.documentElement.dataset.golemTheme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])
  return [
    theme,
    () => {
      const next = theme === 'dark' ? 'light' : 'dark'
      save(THEME_KEY, next)
      setTheme(next)
    },
  ]
}

const paths: Record<string, string> = {
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  settings:
    'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  sun: 'M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  moon: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z',
  close: 'M18 6 6 18M6 6l12 12',
  user: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  wrench:
    'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
}

export type ShellIconName = keyof typeof paths

/** The line icons the bar and the dropdown use; an app's own `Shell.Setting` rows can share them. */
function Icon({ name }: { name: ShellIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

/** An icon-only bar button: the label is the tooltip and the accessible name, never text in the bar. */
function IconButton({
  label,
  on,
  onClick,
  expanded,
  children,
}: {
  label: string
  on?: boolean
  expanded?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      aria-expanded={expanded}
      onClick={onClick}
      className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${
        on || expanded
          ? 'border-(--chat-accent) text-(--chat-accent)'
          : 'border-(--chat-line) text-(--chat-dim) hover:border-(--chat-accent) hover:text-(--chat-accent)'
      }`}
    >
      {children}
    </button>
  )
}

/** One row of the settings dropdown: an icon, a short label, and a dot when it is a toggle. */
function Setting({
  icon,
  label,
  on,
  onClick,
}: {
  icon: ReactNode
  label: string
  /** Set on a toggle; left out on a plain action. */
  on?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-pressed={on}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-(--chat-text) hover:bg-(--chat-panel2)"
    >
      <span aria-hidden="true" className="text-(--chat-dim)">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {on !== undefined && (
        <span
          aria-hidden="true"
          className={`size-2 rounded-full ${on ? 'bg-(--chat-ok)' : 'bg-(--chat-line2)'}`}
        />
      )}
    </button>
  )
}

function ShellFrame({
  config,
  adapters,
  chat,
  canvas,
  account,
  settings,
  onSelect,
}: GolemProps<ShellConfig, ShellAdapters, ShellSlots>) {
  const root = useRef<HTMLDivElement>(null)
  const width = useContainerWidth(root)
  const isMobile = width < config.breakpoint
  const user = useCurrentUser(adapters.identity)
  const [theme, toggleTheme] = useTheme()
  const [route, setRoute] = useState(() => adapters.navigation.current())
  const [gear, setGear] = useState(false)
  const gearRef = useRef<HTMLDivElement>(null)

  // Below the breakpoint the sheet is a modal, and modals start closed; the desktop column starts
  // where this browser left it, else where the config says.
  const [open, setOpen] = useState(() => {
    if (isMobile) return false
    const kept = saved(CHAT_OPEN_KEY)
    return kept === null ? config.chatOpen : kept === '1'
  })
  // Only the desktop column's state is remembered; opening and closing the sheet is not a choice.
  const setChatOpen = (next: boolean) => {
    setOpen(next)
    if (!isMobile) save(CHAT_OPEN_KEY, next ? '1' : '0')
  }
  // Crossing into the phone layout puts the sheet away: an open column is a desk arrangement, not a
  // wish to see nothing but the chat.
  useEffect(() => {
    if (isMobile) setOpen(false)
  }, [isMobile])
  // `chatOpen` flipping after the first paint is the app raising (or lowering) the chat.
  const wanted = useRef(config.chatOpen)
  useEffect(() => {
    if (wanted.current === config.chatOpen) return
    wanted.current = config.chatOpen
    setChatOpen(config.chatOpen)
  })

  // A route change is a screen the reader asked for (a chip in the chat, a link), so the sheet
  // over it closes to show it.
  useEffect(
    () =>
      adapters.navigation.subscribe((next) => {
        setRoute(next)
        if (isMobile) setOpen(false)
      }),
    [adapters.navigation, isMobile],
  )

  // Esc closes the dropdown first, then the sheet; a tap outside closes the dropdown.
  useEffect(() => {
    if (!gear && !(isMobile && open)) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (gear) setGear(false)
      else setChatOpen(false)
    }
    const onPointer = (event: PointerEvent) => {
      if (gear && !gearRef.current?.contains(event.target as Node)) setGear(false)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  })

  const [chatWidth, setChatWidth] = useState(
    () => Number.parseInt(saved(CHAT_WIDTH_KEY) ?? '', 10) || config.chatWidth,
  )
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
      save(CHAT_WIDTH_KEY, String(widthAt(e)))
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', up)
  }
  const resetResize = () => {
    setChatWidth(config.chatWidth)
    save(CHAT_WIDTH_KEY, null)
  }

  const activeId =
    config.activeId ??
    config.menu.find((item) => item.href !== undefined && route.path.startsWith(item.href))?.id

  const chatPane = (
    <div className="h-full min-w-0 overflow-hidden">
      {chat ?? <Placeholder label="agent chat" />}
    </div>
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
      data-chat={chat === null ? 'none' : open ? 'open' : 'closed'}
      className="golem-shell flex h-dvh max-h-full min-h-0 w-full flex-col overflow-hidden bg-(--chat-bg) pb-[env(safe-area-inset-bottom)] text-(--chat-text)"
    >
      {config.showTopBar && (
        <header className="flex min-h-11 shrink-0 items-center gap-2 border-b border-(--chat-line) bg-(--chat-panel) px-3 pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={() => adapters.navigation.go('/')}
            className="min-w-0 truncate text-[15px] font-semibold tracking-wide hover:underline"
          >
            {config.title}
          </button>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            {chat !== null && (
              <IconButton label="Chat" on={open} onClick={() => setChatOpen(!open)}>
                <Icon name="chat" />
              </IconButton>
            )}
            <div ref={gearRef} className="relative">
              <IconButton label="Settings" expanded={gear} onClick={() => setGear(!gear)}>
                <Icon name="settings" />
              </IconButton>
              {gear && (
                <div
                  role="menu"
                  className="absolute top-full right-0 z-30 mt-1.5 w-56 rounded-xl border border-(--chat-line2) bg-(--chat-panel) p-1.5 shadow-lg"
                >
                  <Setting
                    icon={<Icon name={theme === 'dark' ? 'sun' : 'moon'} />}
                    label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    onClick={toggleTheme}
                  />
                  {settings}
                </div>
              )}
            </div>
            {account ??
              (user && (
                <span className="max-w-32 truncate text-sm text-(--chat-dim)">{user.name}</span>
              ))}
          </span>
        </header>
      )}

      <div className="relative flex min-h-0 flex-1 flex-col">
        {config.menu.length > 0 && (
          <nav
            aria-label="Menu"
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-(--chat-line) px-2 py-1.5"
          >
            {config.menu.map((item) => {
              const active = item.id === activeId
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() =>
                    item.href !== undefined ? adapters.navigation.go(item.href) : onSelect?.(item.id)
                  }
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                    active
                      ? 'bg-(--chat-accent-soft) text-(--chat-accent)'
                      : 'text-(--chat-dim) hover:text-(--chat-text)'
                  }`}
                >
                  {item.icon && (
                    <span aria-hidden="true" className="mr-1.5">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        {isMobile || chat === null ? (
          <div className="flex min-h-0 flex-1">{canvasPane}</div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 ${
              config.chatSide === 'right' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <aside
              hidden={!open}
              data-golem-chat-width={clampChat(chatWidth)}
              style={{ width: clampChat(chatWidth) }}
              className={`relative shrink-0 border-(--chat-line) ${
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
                className={`absolute top-0 bottom-0 z-10 w-[7px] cursor-col-resize touch-none hover:bg-(--chat-accent-soft) active:bg-(--chat-accent-soft) ${
                  config.chatSide === 'left' ? '-right-[3px]' : '-left-[3px]'
                }`}
              />
            </aside>
            {canvasPane}
          </div>
        )}

        {/* The sheet covers the menu row and the canvas, which stay mounted and keep their scroll. */}
        {isMobile && chat !== null && (
          <div
            role="dialog"
            aria-label="Chat"
            aria-modal="true"
            hidden={!open}
            className="absolute inset-0 z-20 bg-(--chat-bg)"
          >
            {chatPane}
          </div>
        )}
      </div>
    </div>
  )
}

const ShellComponent = defineComponent<typeof shellConfigSchema, ShellAdapters, ShellSlots>({
  name: 'Shell',
  schema: shellConfigSchema,
  render: ShellFrame,
})

/** The frame, plus `Shell.Setting` (a dropdown row) and `Shell.Icon` (the bar's line icons) for the app's own rows. */
export const Shell = Object.assign(ShellComponent, { Setting, Icon })
