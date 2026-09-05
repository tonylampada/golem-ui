import {
  fakeChat,
  fakeClock,
  fakeFiles,
  fakeIdentity,
  fakeRecords,
  type IdentityAdapter,
  type NavigationAdapter,
  type Route,
  type Unsubscribe,
} from 'golem-ui'
import {
  cannedReplies,
  conversation,
  jobs,
  reports,
  shopFiles,
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

const INVITES_KEY = 'northgate-invites'

function readInvites(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(INVITES_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

const openInvites = readInvites()

function rememberInvites() {
  try {
    localStorage.setItem(INVITES_KEY, JSON.stringify(openInvites))
  } catch {
    // A browser with storage switched off still gets a working demo inside one page load.
  }
}

/**
 * Signed out on purpose: the showcase opens on the sign-in screen, and the invite links it mints
 * point back at this same page under whatever path Pages is serving it from.
 */
const shopIdentity = fakeIdentity({
  user: null,
  members,
  password: SHOP_PASSWORD,
  defaultRole: 'mechanic',
  invites: openInvites,
  inviteBase: `${window.location.origin}${window.location.pathname}#/join?invite=`,
})

/**
 * The fake holds its invites in memory, which a demo cannot: an invite link is meant to be opened
 * in another tab, and that is a cold page load. So the tokens are kept in `localStorage` — minted
 * on `invite`, spent on `signUp`, exactly once either way.
 */
export const identity: IdentityAdapter = {
  ...shopIdentity,
  async invite(role) {
    const url = await shopIdentity.invite(role)
    openInvites[url.slice(url.lastIndexOf('=') + 1)] = role
    rememberInvites()
    return url
  },
  async signUp(input) {
    const user = await shopIdentity.signUp(input)
    if (input.invite) {
      delete openInvites[input.invite]
      rememberInvites()
    }
    return user
  },
}
export const clock = fakeClock(TODAY, TIME_ZONE)
/**
 * The shop's files, seeded with what the log and the seeded conversation already attach. Uploads
 * land here too, so a photo taken on the Files screen is a photo the picker in the chat can attach.
 */
export const files = fakeFiles({ seed: shopFiles })

export const records = fakeRecords({
  jobs: jobs.map((job) => ({ ...job })),
  log: shopLog.map((entry) => ({ ...entry })),
  reports: reports.map((report) => ({ ...report })),
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
