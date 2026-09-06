import { useEffect, useState } from 'react'
import { Auth, Shell, type Route } from 'golem-ui'
import { Canvas } from './Canvas'
import { ChatColumn } from './ChatColumn'
import { ApiIndex, ApiPage } from './screens/Api'
import { authConfig } from './auth-config'
import { chat, clock, files, identity, navigation, records } from './adapters'

const SITE_URL = 'https://tonylampada.github.io/golem-ui/'

const canvasAdapters = { records, clock, files, identity, navigation }
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
        <span className="flex shrink-0 gap-3">
          <a href="#/api" className="font-medium text-white underline">
            API
          </a>
          <a href={SITE_URL} className="font-medium text-white underline">
            Site
          </a>
        </span>
      </div>

      <div className="min-h-0 flex-1">{screenFor(route)}</div>
    </div>
  )
}

function screenFor(route: Route) {
  const path = route.path

  // The API pages are the kit's spec, so they sit outside the guard: signed out is how most
  // readers arrive, and an agent reading them has no account at all.
  if (path === '/api') return <ApiIndex navigation={navigation} />
  if (path.startsWith('/api/')) {
    const slug = path.slice('/api/'.length)
    // Keyed by slug so moving between component pages remounts and starts at the top, rather
    // than dropping the reader halfway down the next page.
    return <ApiPage key={slug} slug={slug} navigation={navigation} />
  }

  return (
    // The front door: no roles, so any signed-in member gets in and everyone else gets sign-in.
    <div className="h-full">
      <Auth.Guard config={authConfig} adapters={authAdapters}>
        <Shell
          config={{ title: 'Northgate Cycles', chatSide: 'left', breakpoint: 768 }}
          adapters={{ identity, navigation }}
          chat={<ChatColumn adapter={chat} files={files} />}
          canvas={<Canvas route={route} adapters={canvasAdapters} />}
          account={<Auth.AccountMenu config={authConfig} adapters={authAdapters} />}
        />
      </Auth.Guard>
    </div>
  )
}
