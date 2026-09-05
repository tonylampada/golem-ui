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
  signedIn,
  team,
  TIME_ZONE,
  TODAY,
} from './seed'

/**
 * Every adapter the showcase wires. The kit's fakes cover identity, records, files, the clock and
 * the chat; `hashNavigation` below is the app's own, because a demo needs a real URL.
 */

export const identity = fakeIdentity(signedIn)
export const clock = fakeClock(TODAY, TIME_ZONE)
export const files = fakeFiles()

export const records = fakeRecords({
  jobs: jobs.map((job) => ({ ...job })),
  log: shopLog.map((entry) => ({ ...entry })),
  attachments: attachments.map((file) => ({ ...file })),
  team: team.map((member) => ({ ...member })),
})

const DEFAULT_PATH = '/today'

function routeFromHash(): Route {
  const path = window.location.hash.replace(/^#/, '')
  return { path: path.startsWith('/') ? path : DEFAULT_PATH, params: {} }
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
