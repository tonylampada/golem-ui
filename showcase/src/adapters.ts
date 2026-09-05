import {
  fakeChat,
  fakeClock,
  fakeFiles,
  fakeIdentity,
  fakeRecords,
  type NavigationAdapter,
  type Route,
  type Unsubscribe,
} from 'golem-ui'
import {
  attachments,
  cannedReplies,
  conversation,
  jobs,
  shopLog,
  members,
  SHOP_PASSWORD,
  TIME_ZONE,
  TODAY,
} from './seed'

/**
 * Every adapter the showcase wires. The kit's fakes cover identity, records, files, the clock and
 * the chat; `hashNavigation` below is the app's own, because a demo needs a real URL.
 */

/**
 * Signed out on purpose: the showcase opens on the sign-in screen, and the invite links it mints
 * point back at this same page under whatever path Pages is serving it from.
 */
export const identity = fakeIdentity({
  user: null,
  members,
  password: SHOP_PASSWORD,
  defaultRole: 'mechanic',
  inviteBase: `${window.location.origin}${window.location.pathname}#/join?invite=`,
})
export const clock = fakeClock(TODAY, TIME_ZONE)
export const files = fakeFiles()

export const records = fakeRecords({
  jobs: jobs.map((job) => ({ ...job })),
  log: shopLog.map((entry) => ({ ...entry })),
  attachments: attachments.map((file) => ({ ...file })),
})

const DEFAULT_PATH = '/today'

function routeFromHash(): Route {
  const [path = '', query = ''] = window.location.hash.replace(/^#/, '').split('?')
  return {
    path: path.startsWith('/') ? path : DEFAULT_PATH,
    // Auth reads its invite token out of here, so the query has to survive the hash.
    params: Object.fromEntries(new URLSearchParams(query)),
  }
}

/**
 * `fakeNavigation` keeps the route in memory, which loses it on reload and makes a screen
 * unlinkable. The hash survives both, and survives being served under a Pages subpath.
 */
export function hashNavigation(): NavigationAdapter {
  const listeners = new Set<(route: Route) => void>()
  window.addEventListener('hashchange', () => {
    const next = routeFromHash()
    for (const listener of listeners) listener(next)
  })

  return {
    current: routeFromHash,
    go(path: string) {
      window.location.hash = path
    },
    subscribe(listener): Unsubscribe {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const navigation = hashNavigation()

/**
 * The kit's own fake, which streams its reply word by word — so the composer on a phone answers
 * instead of swallowing what you type, and the showcase shows the streaming path working.
 */
export const chat = fakeChat(conversation, { replies: cannedReplies, tokenDelayMs: 45 })
