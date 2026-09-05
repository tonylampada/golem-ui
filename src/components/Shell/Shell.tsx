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
      className="golem-shell flex h-full min-h-0 w-full flex-col bg-white text-neutral-900"
    >
      {config.showTopBar && (
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3">
          <button
            type="button"
            onClick={() => adapters.navigation.go('/')}
            className="truncate text-base font-semibold hover:underline"
          >
            {config.title}
          </button>
          {account ??
            (user && <span className="shrink-0 text-sm text-neutral-500">{user.name}</span>)}
        </header>
      )}

      {isMobile ? (
        <>
          <div role="tablist" className="flex shrink-0 border-b border-neutral-200">
            {(['chat', 'canvas'] as const).map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={tab === name}
                onClick={() => setTab(name)}
                className={`flex-1 px-4 py-2 text-sm capitalize ${
                  tab === name ? 'border-b-2 border-neutral-900 font-medium' : 'text-neutral-500'
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
            className={`w-80 shrink-0 border-neutral-200 ${
              config.chatSide === 'left' ? 'border-r' : 'border-l'
            }`}
          >
            {chatPane}
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
