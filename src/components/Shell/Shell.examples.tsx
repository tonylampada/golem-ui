import type { GolemProps } from '../../abi'
import { fakeIdentity, fakeNavigation } from '../../adapters/fake'
import type { ShellAdapters, ShellSlots } from './Shell'
import type { ShellConfigInput } from './Shell.config'

export type ShellProps = GolemProps<ShellConfigInput, ShellAdapters, ShellSlots>

export interface ShellExample {
  name: string
  summary: string
  props: ShellProps
  /** Width the example is meant to be seen at; the phone examples sit below their breakpoint. */
  viewportWidth: number
  /** A bar button the story presses after the first paint, so a sheet or a dropdown is open. */
  press?: 'Chat' | 'Settings'
}

/**
 * Adapters are built once, at module load, so the props identity is stable: a component that is
 * handed a new adapter object on every render would re-subscribe on every render.
 */
const adapters: ShellAdapters = {
  identity: fakeIdentity(),
  navigation: fakeNavigation({ path: '/today', params: {} }),
}

const menu = [
  { id: 'today', label: 'Today', href: '/today' },
  { id: 'jobs', label: 'Jobs', href: '/jobs' },
  { id: 'report', label: 'Report', href: '/report' },
  { id: 'brain', label: 'Brain', icon: '🧠', href: '/brain' },
]

const chat = (
  <div className="space-y-3 p-4 text-sm">
    <p className="rounded-lg bg-(--chat-panel) p-3">What do you want to build?</p>
    <p className="rounded-lg bg-(--chat-user) p-3">A daily report I can read on my phone.</p>
    <p className="rounded-lg bg-(--chat-panel) p-3">Writing that into the DNA now.</p>
  </div>
)

const canvas = (
  <div className="p-6">
    <h2 className="text-lg font-semibold">Daily report — 10 September</h2>
    <p className="mt-2 max-w-prose text-sm text-(--chat-dim)">
      Nine tickets closed, average turnaround 2.6 days. Two bikes are waiting for collection.
    </p>
  </div>
)

/** The complete example the docs page shows, and the one the tests assert on. */
export const desktop: ShellExample = {
  name: 'Desktop, chat open',
  summary:
    'The bar: title, chat toggle, gear, avatar. The menu row under it. Chat column on the left, canvas on the right.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles', menu },
    adapters,
    chat,
    canvas,
  },
}

export const desktopChatClosed: ShellExample = {
  name: 'Desktop, chat closed',
  summary: 'The toggle off: the canvas has the whole width.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles', menu, chatOpen: false },
    adapters,
    chat,
    canvas,
  },
}

export const chatOnRight: ShellExample = {
  name: 'Chat on the right',
  summary: 'The same frame mirrored, for people who read the canvas first.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles', menu, chatSide: 'right' },
    adapters,
    chat,
    canvas,
  },
}

export const settingsOpen: ShellExample = {
  name: 'Settings open',
  summary: 'The gear dropdown: the theme toggle, then whatever rows the app put in the `settings` slot.',
  viewportWidth: 1200,
  press: 'Settings',
  props: {
    config: { title: 'Northgate Cycles', menu },
    adapters,
    chat,
    canvas,
  },
}

export const phone: ShellExample = {
  name: 'Phone',
  summary: 'Below the breakpoint: bar, menu row, canvas. The chat is behind the toggle.',
  viewportWidth: 390,
  props: {
    config: { title: 'Northgate Cycles', menu, breakpoint: 768 },
    adapters,
    chat,
    canvas,
  },
}

export const phoneChatOpen: ShellExample = {
  name: 'Phone, chat open',
  summary: 'The toggle pressed: the chat is a sheet over the app. Esc or the toggle closes it.',
  viewportWidth: 390,
  press: 'Chat',
  props: {
    config: { title: 'Northgate Cycles', menu, breakpoint: 768 },
    adapters,
    chat,
    canvas,
  },
}

export const withoutTopBar: ShellExample = {
  name: 'Without the top bar',
  summary: 'For hosts that already draw their own header. The menu row stays.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles', menu, showTopBar: false },
    adapters,
    chat,
    canvas,
  },
}

export const invalidConfig: ShellExample = {
  name: 'Invalid config',
  summary: 'An empty title and a breakpoint below the minimum: the error card names both fields.',
  viewportWidth: 1200,
  props: {
    config: { title: '', breakpoint: 10 } as unknown as ShellConfigInput,
    adapters,
    chat,
    canvas,
  },
}

export const shellExamples = [
  desktop,
  desktopChatClosed,
  chatOnRight,
  settingsOpen,
  phone,
  phoneChatOpen,
  withoutTopBar,
  invalidConfig,
]
