import type { GolemProps } from '../../abi'
import type { User } from '../../adapters'
import {
  fakeClock,
  fakeFiles,
  fakeIdentity,
  fakeRecords,
  type FakeRecords,
} from '../../adapters/fake'
import type { TimelineAdapters } from './Timeline'
import type { TimelineConfigInput } from './Timeline.config'

export type TimelineProps = GolemProps<TimelineConfigInput, TimelineAdapters>

export interface TimelineExample {
  name: string
  summary: string
  props: TimelineProps
  /** The width the example is meant to be read at; the story frames it there. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-list on every render.
 *
 * The entries are the shop log at Northgate Cycles, the invented bike shop the showcase is set in.
 * `NOW` is the same frozen instant the showcase's clock is set to, so "14 min ago" is 14 minutes
 * every run.
 */

export const NOW = new Date('2026-09-10T13:20:00Z')

/** A type rather than an interface, so it carries the implicit index signature `fakeRecords` takes. */
export type ShopEntry = {
  id: string
  at: string
  body: string
  kind: string
  actor: string
  files?: { id: string; name: string }[]
}

/** Four kinds, one per tone, which is also the vocabulary an agent picks `tone` from. */
export const shopKinds: TimelineConfigInput['kinds'] = [
  { id: 'note', label: 'Note', tone: 'neutral' },
  { id: 'done', label: 'Done', tone: 'good' },
  { id: 'parts', label: 'Parts', tone: 'warn' },
  { id: 'problem', label: 'Problem', tone: 'bad' },
]

export const shopLog: ShopEntry[] = [
  {
    id: 'e-31',
    at: '2026-09-10T13:06:00Z',
    kind: 'done',
    actor: 'Omar Bright',
    body: '**#4186 Trek FX 3** back together — chain, cassette and both brakes bled. On the collection rack.',
  },
  {
    id: 'e-30',
    at: '2026-09-10T12:15:00Z',
    kind: 'note',
    actor: 'Theo Lang',
    body: 'Owen called about #4186. Collecting after five, paying at the counter.',
  },
  {
    id: 'e-29',
    at: '2026-09-10T09:40:00Z',
    kind: 'problem',
    actor: 'Priya Sandoval',
    body: '#4185 fork lowers are weeping worse than Monday. Photographed both legs before I stripped them.',
    files: [{ id: 'f-3', name: 'rockhopper-fork-seals.jpg' }],
  },
  {
    id: 'e-28',
    at: '2026-09-10T08:05:00Z',
    kind: 'parts',
    actor: 'Nadia Kessler',
    body: 'Spoke order landed. Enough drive-side 292mm for the Kona rebuild and two spares.',
  },
  {
    id: 'e-27',
    at: '2026-09-09T16:20:00Z',
    kind: 'parts',
    actor: 'Priya Sandoval',
    body: 'SKF seal kit for #4185 quoted Thursday by the supplier. Told the customer by text.',
    files: [{ id: 'f-2', name: 'supplier-invoice-2211.pdf' }],
  },
  {
    id: 'e-26',
    at: '2026-09-09T11:30:00Z',
    kind: 'done',
    actor: 'Hana Vogt',
    body: 'First wheel built unsupervised. It is true and it holds.',
  },
  {
    id: 'e-25',
    at: '2026-09-09T09:10:00Z',
    kind: 'note',
    actor: 'Nadia Kessler',
    body: 'Counter clear for the first time since Monday.',
  },
  {
    id: 'e-24',
    at: '2026-09-08T15:45:00Z',
    kind: 'done',
    actor: 'Omar Bright',
    body: '**#4184 Brompton M6L** collected at four. Hinge plate and all four cables.',
  },
  {
    id: 'e-23',
    at: '2026-09-08T10:00:00Z',
    kind: 'problem',
    actor: 'Nadia Kessler',
    body: 'Suspension bench booked out to the 22nd, and Priya is the only one certified on it. Either a second pair of hands or a longer lead time at the counter.',
  },
  {
    id: 'e-22',
    at: '2026-09-07T14:20:00Z',
    kind: 'note',
    actor: 'Theo Lang',
    body: 'Six bikes in over the weekend. Monday is accounted for.',
  },
  {
    id: 'e-21',
    at: '2026-09-07T09:05:00Z',
    kind: 'done',
    actor: 'Nadia Kessler',
    body: '#4183 cut-out traced to a chafed speed-sensor lead, not the battery. Re-routed and taped.',
  },
  {
    id: 'e-20',
    at: '2026-09-04T16:00:00Z',
    kind: 'note',
    actor: 'Nadia Kessler',
    body: 'Turnaround target set to three days at the Friday stand-up.',
  },
]

/** The shop's people, so the composer has somebody to sign an entry with. */
export const members: User[] = [
  {
    id: 'u-nadia',
    name: 'Nadia Kessler',
    email: 'nadia@northgatecycles.example',
    roles: ['owner'],
  },
  { id: 'u-omar', name: 'Omar Bright', email: 'omar@northgatecycles.example', roles: ['mechanic'] },
]

const clock = fakeClock(NOW)
const files = fakeFiles()

const shopAdapters: TimelineAdapters = {
  records: fakeRecords({ log: shopLog }),
  clock,
  files,
}

const todayOnly: TimelineAdapters = {
  records: fakeRecords({ log: shopLog.filter((entry) => entry.at.startsWith('2026-09-10')) }),
  clock,
  files,
}

const emptyAdapters: TimelineAdapters = { records: fakeRecords({ log: [] }), clock }

const composerAdapters: TimelineAdapters = {
  records: fakeRecords({ log: shopLog.slice(0, 4) }),
  clock,
  files,
  identity: fakeIdentity({ user: members[0], members }),
}

/**
 * A collection something else is writing to: an entry lands 2.5 seconds after the timeline
 * subscribes, and it slides in at the top. Nothing here polls.
 */
function arrivingRecords(): FakeRecords {
  const store = fakeRecords({ log: shopLog.slice(0, 6) })
  let written = 0

  return {
    ...store,
    subscribe(collection, listener) {
      const unsubscribe = store.subscribe(collection, listener)
      const timer = setTimeout(() => {
        written += 1
        store.insert(collection, {
          at: new Date(NOW.getTime() + written * 60_000).toISOString(),
          kind: 'done',
          actor: 'Nadia Kessler',
          body: '**#4187 Kona Rove** rear wheel trued and tensioned. Off the stand.',
        })
      }, 2500)
      return () => {
        clearTimeout(timer)
        unsubscribe()
      }
    },
  }
}

const liveAdapters: TimelineAdapters = { records: arrivingRecords(), clock, files }

export const aDay: TimelineExample = {
  name: 'A day',
  summary:
    'One day of the shop log against a frozen clock: every time is how long ago it was, and the day heads itself as Today.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      kindField: 'kind',
      kinds: shopKinds,
      actorField: 'actor',
      attachmentsField: 'files',
    },
    adapters: todayOnly,
  },
}

export const groupedDays: TimelineExample = {
  name: 'Grouped days',
  summary:
    'Four days of entries, each under a sticky header. Today is relative, every other day is a clock time, and an attachment is a chip that opens through `Files.url`.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      kindField: 'kind',
      kinds: shopKinds,
      actorField: 'actor',
      attachmentsField: 'files',
      pageSize: 5,
    },
    adapters: shopAdapters,
  },
}

export const filtered: TimelineExample = {
  name: 'Filters and search',
  summary:
    'Chips for kind and for who wrote the entry, and a search box over the body. Choose Problem and two entries are left; `Load 5 older` fetches the next page.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      kindField: 'kind',
      kinds: shopKinds,
      actorField: 'actor',
      attachmentsField: 'files',
      filters: ['kind', 'actor'],
      search: ['body'],
      pageSize: 5,
    },
    adapters: shopAdapters,
  },
}

export const withComposer: TimelineExample = {
  name: 'Composer',
  summary:
    'A one-line box above the log. What it writes is stamped with the clock’s instant and with the signed-in member, and arrives back through `subscribe`.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      kindField: 'kind',
      kinds: shopKinds,
      actorField: 'actor',
      composer: true,
    },
    adapters: composerAdapters,
  },
}

export const live: TimelineExample = {
  name: 'An entry arriving',
  summary:
    'Six entries, and a seventh written by something else 2.5 seconds after mount. It slides in at the top; scroll down first and a pill counts it instead.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      kindField: 'kind',
      kinds: shopKinds,
      actorField: 'actor',
      pageSize: 6,
    },
    adapters: liveAdapters,
  },
}

export const empty: TimelineExample = {
  name: 'Empty',
  summary: 'A collection with nothing in it: the `emptyState` line, and the controls still there.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      dateField: 'at',
      bodyField: 'body',
      search: ['body'],
      emptyState: 'Nothing on the log yet. The agent writes a line when a ticket moves.',
    },
    adapters: emptyAdapters,
  },
}

export const invalidConfig: TimelineExample = {
  name: 'Invalid config',
  summary:
    'A kind toned `info`, which is not one of the four. The card names the entry by its position and lists them.',
  viewportWidth: 700,
  props: {
    config: {
      collection: 'log',
      kindField: 'kind',
      kinds: [
        { id: 'note', label: 'Note', tone: 'neutral' },
        { id: 'done', label: 'Done', tone: 'info' },
      ],
    } as unknown as TimelineConfigInput,
    adapters: shopAdapters,
  },
}

export const timelineExamples = [
  aDay,
  groupedDays,
  filtered,
  withComposer,
  live,
  empty,
  invalidConfig,
]
