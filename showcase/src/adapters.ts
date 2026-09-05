import {
  fakeClock,
  fakeFiles,
  fakeIdentity,
  fakeRecords,
  type ChatAdapter,
  type ChatMessage,
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
 * Every adapter the showcase wires. The kit's fakes cover identity, records, files and the clock;
 * the two below are the app's own, because a demo needs a real URL and an agent that answers.
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
 * `fakeChat` records what you send but never answers, which reads as a broken app rather than a
 * demo. This one replies from a canned list, so the composer on a phone does something.
 */
export function demoChat(seed: ChatMessage[]): ChatAdapter {
  const messages = [...seed]
  const listeners = new Set<(messages: ChatMessage[]) => void>()
  let sent = 0

  const emit = () => {
    for (const listener of listeners) listener([...messages])
  }

  return {
    async history() {
      return [...messages]
    },
    async send(text: string) {
      const at = new Date().toISOString()
      messages.push({ id: `msg-${messages.length + 1}`, role: 'user', text, at })
      emit()
      const reply = cannedReplies[sent % cannedReplies.length]!
      sent += 1
      setTimeout(() => {
        messages.push({
          id: `msg-${messages.length + 1}`,
          role: 'agent',
          text: reply,
          at: new Date().toISOString(),
        })
        emit()
      }, 700)
    },
    subscribe(listener): Unsubscribe {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const chat = demoChat(conversation)
