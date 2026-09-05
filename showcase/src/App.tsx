import { useEffect, useState } from 'react'
import { Auth, Shell } from 'golem-ui'
import { Canvas } from './Canvas'
import { ChatColumn } from './ChatColumn'
import { authConfig } from './auth-config'
import { chat, clock, identity, navigation, records } from './adapters'

const DOCS_URL = 'https://tonylampada.github.io/golem-ui/'

const canvasAdapters = { records, clock, identity, navigation }
const authAdapters = { identity, navigation }

export function App() {
  const [route, setRoute] = useState(navigation.current())

  useEffect(() => navigation.subscribe(setRoute), [])

  return (
    <div className="flex h-dvh flex-col">
      {/* Says what this page is, and points back at the kit it is built from. */}
      <div className="flex shrink-0 items-center justify-between gap-3 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300">
        <span className="truncate">
          <strong className="font-semibold text-white">golem-ui</strong> showcase — a demo app, no
          backend
        </span>
        <a href={DOCS_URL} className="shrink-0 font-medium text-white underline">
          Docs
        </a>
      </div>

      {/* The front door: no roles, so any signed-in member gets in and everyone else gets sign-in. */}
      <div className="min-h-0 flex-1">
        <Auth.Guard config={authConfig} adapters={authAdapters}>
          <Shell
            config={{ title: 'Northgate Cycles', chatSide: 'left', breakpoint: 768 }}
            adapters={{ identity, navigation }}
            chat={<ChatColumn adapter={chat} />}
            canvas={<Canvas route={route} adapters={canvasAdapters} />}
            account={<Auth.AccountMenu config={authConfig} adapters={authAdapters} />}
          />
        </Auth.Guard>
      </div>
    </div>
  )
}
