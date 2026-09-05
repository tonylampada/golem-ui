import type { GolemProps } from '../../abi'
import { fakeIdentity, fakeNavigation } from '../../adapters/fake'
import type { ShellAdapters, ShellSlots } from './Shell'
import type { ShellConfigInput } from './Shell.config'

export type ShellProps = GolemProps<ShellConfigInput, ShellAdapters, ShellSlots>

export interface ShellExample {
  name: string
  summary: string
  props: ShellProps
  /** Width the example is meant to be seen at; the mobile examples sit below their breakpoint. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so the props identity is stable: a component that is
 * handed a new adapter object on every render would re-subscribe on every render.
 */
const adapters: ShellAdapters = {
  identity: fakeIdentity(),
  navigation: fakeNavigation({ path: '/today', params: {} }),
}

const chat = (
  <div className="space-y-3 p-4 text-sm">
    <p className="rounded-lg bg-neutral-100 p-3">What do you want to build?</p>
    <p className="rounded-lg bg-blue-50 p-3">A daily report I can read on my phone.</p>
    <p className="rounded-lg bg-neutral-100 p-3">Writing that into the DNA now.</p>
  </div>
)

const canvas = (
  <div className="p-6">
    <h2 className="text-lg font-semibold">Daily report — 10 September</h2>
    <p className="mt-2 max-w-prose text-sm text-neutral-600">
      Nine tickets closed, average turnaround 2.6 days. Two bikes are waiting for collection.
    </p>
  </div>
)

/** The complete example the docs page shows, and the one the tests assert on. */
export const desktop: ShellExample = {
  name: 'Desktop',
  summary: 'Chat on the left, canvas on the right, top bar showing the signed-in user.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles' },
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
    config: { title: 'Northgate Cycles', chatSide: 'right' },
    adapters,
    chat,
    canvas,
  },
}

export const mobile: ShellExample = {
  name: 'Mobile',
  summary: 'Below the breakpoint the two panes become tabs.',
  viewportWidth: 420,
  props: {
    config: { title: 'Northgate Cycles', breakpoint: 768 },
    adapters,
    chat,
    canvas,
  },
}

export const withoutTopBar: ShellExample = {
  name: 'Without the top bar',
  summary: 'For hosts that already draw their own header.',
  viewportWidth: 1200,
  props: {
    config: { title: 'Northgate Cycles', showTopBar: false },
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

export const shellExamples = [desktop, chatOnRight, mobile, withoutTopBar, invalidConfig]
