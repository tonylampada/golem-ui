import type { GolemProps } from '../../abi'
import { fakeRecords, type FakeRecords } from '../../adapters/fake'
import type { RecordsAdapter } from '../../adapters'
import type { RecordListAdapters, RecordListSlots } from './RecordList'
import type { RecordListConfigInput } from './RecordList.config'

export type RecordListProps = GolemProps<RecordListConfigInput, RecordListAdapters, RecordListSlots>

export interface RecordListExample {
  name: string
  summary: string
  props: RecordListProps
  /** Under 768 the list draws cards; above it, the table. The story frames it at this width. */
  viewportWidth: number
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-list on every render.
 *
 * The rows are repair tickets at Northgate Cycles, the invented bike shop the showcase is set in.
 */

export const tickets = [
  {
    id: 'j-4187',
    ticket: '#4187',
    customer: 'Delia Marchetti',
    bike: 'Kona Rove, 2019',
    status: 'in progress',
    assignee: 'Nadia Kessler',
    date: '2026-09-10',
    quote: 140,
    hours: 3.5,
    approved: true,
  },
  {
    id: 'j-4186',
    ticket: '#4186',
    customer: 'Owen Pratt',
    bike: 'Trek FX 3',
    status: 'ready',
    assignee: 'Omar Bright',
    date: '2026-09-10',
    quote: 85,
    hours: 1.75,
    approved: true,
  },
  {
    id: 'j-4185',
    ticket: '#4185',
    customer: 'Renata Oyelaran',
    bike: 'Specialized Rockhopper',
    status: 'waiting',
    assignee: 'Priya Sandoval',
    date: '2026-09-09',
    quote: 210,
    hours: 2,
    approved: true,
  },
  {
    id: 'j-4184',
    ticket: '#4184',
    customer: 'Sam Ferreira-Okoye',
    bike: 'Brompton M6L',
    status: 'ready',
    assignee: 'Omar Bright',
    date: '2026-09-08',
    quote: 120,
    hours: 1.25,
    approved: true,
  },
  {
    id: 'j-4183',
    ticket: '#4183',
    customer: 'Marguerite Lowe',
    bike: 'Gazelle Ultimate C380',
    status: 'ready',
    assignee: 'Nadia Kessler',
    date: '2026-09-07',
    quote: 60,
    hours: 0.75,
    approved: false,
  },
  {
    id: 'j-4182',
    ticket: '#4182',
    customer: 'Ines Doncheva',
    bike: 'Surly Long Haul Trucker',
    status: 'ready',
    assignee: 'Hana Vogt',
    date: '2026-09-05',
    quote: 45,
    hours: 0.5,
    approved: true,
  },
  {
    id: 'j-4181',
    ticket: '#4181',
    customer: 'Callum Whitcombe',
    bike: 'Ribble Endurance SL',
    status: 'waiting',
    assignee: 'Priya Sandoval',
    date: '2026-09-04',
    quote: 320,
    hours: 4,
    approved: false,
  },
]

/** Every field type in one list, which is also the vocabulary an agent picks `type` from. */
export const ticketFields: RecordListConfigInput['fields'] = [
  { key: 'ticket', label: 'Ticket', type: 'text', primary: true },
  { key: 'customer', label: 'Customer', type: 'text' },
  { key: 'bike', label: 'Bike', type: 'text' },
  { key: 'status', label: 'Status', type: 'enum' },
  { key: 'assignee', label: 'Mechanic', type: 'user' },
  { key: 'date', label: 'Booked in', type: 'date', format: 'medium' },
  { key: 'quote', label: 'Quote', type: 'money', format: 'USD' },
  { key: 'hours', label: 'Bench hours', type: 'number', format: '2' },
  { key: 'approved', label: 'Approved', type: 'boolean' },
]

const shopAdapters: RecordListAdapters = { records: fakeRecords({ tickets }) }
const emptyAdapters: RecordListAdapters = { records: fakeRecords({ tickets: [] }) }

/** A list that never resolves, which is what the loading state actually looks like. */
const pendingAdapters: RecordListAdapters = {
  records: {
    list: () => new Promise(() => {}),
    subscribe: () => () => {},
  } satisfies RecordsAdapter,
}

/**
 * A collection something else is writing to: a ticket lands 2.5 seconds after the list subscribes,
 * and the list re-lists on its own. Nothing here polls.
 */
function arrivingRecords(): FakeRecords {
  const store = fakeRecords({ tickets: tickets.slice(0, 4) })
  let taken = 0

  return {
    ...store,
    subscribe(collection, listener) {
      const unsubscribe = store.subscribe(collection, listener)
      const timer = setTimeout(() => {
        taken += 1
        store.insert(collection, {
          ticket: `#${4187 + taken}`,
          customer: 'Bram Ostrowski',
          bike: 'Cannondale Topstone',
          status: 'waiting',
          assignee: 'Hana Vogt',
          date: '2026-09-11',
          quote: 95,
          hours: 1,
          approved: false,
        })
      }, 2500)
      return () => {
        clearTimeout(timer)
        unsubscribe()
      }
    },
  }
}

const liveAdapters: RecordListAdapters = { records: arrivingRecords() }

export const table: RecordListExample = {
  name: 'Table',
  summary:
    'Every field type in one table at desktop width: text, enum as a chip, a user, a date, money, a number and a boolean. Click a heading to sort.',
  viewportWidth: 1100,
  props: {
    config: {
      collection: 'tickets',
      fields: ticketFields,
      sort: { field: 'date', direction: 'desc' },
      pageSize: 25,
      emptyState: 'No tickets on the board.',
      density: 'comfortable',
      rowAction: 'open',
    },
    adapters: shopAdapters,
  },
}

export const cards: RecordListExample = {
  name: 'Cards',
  summary:
    'The same config below 768px: one card per record, the primary field as its title and the enum as a chip.',
  viewportWidth: 390,
  props: table.props,
}

export const filteredAndSearched: RecordListExample = {
  name: 'Filters and search',
  summary:
    'Chips for status and mechanic, and a search box that matches the customer, the bike or the ticket number. Type “rock” to see one row left.',
  viewportWidth: 1100,
  props: {
    config: {
      collection: 'tickets',
      fields: ticketFields,
      sort: { field: 'date', direction: 'desc' },
      filters: ['status', 'assignee'],
      search: ['ticket', 'customer', 'bike'],
      pageSize: 3,
      rowAction: 'open',
    },
    adapters: shopAdapters,
  },
}

export const empty: RecordListExample = {
  name: 'Empty',
  summary: 'A collection with nothing in it: the `emptyState` line, and the controls still there.',
  viewportWidth: 1100,
  props: {
    config: {
      collection: 'tickets',
      fields: ticketFields,
      search: ['ticket', 'customer'],
      emptyState: 'No tickets on the board. The agent writes one when a bike comes in.',
    },
    adapters: emptyAdapters,
  },
}

export const loading: RecordListExample = {
  name: 'Loading',
  summary: 'While the first page is in flight. An adapter that never resolves stays here.',
  viewportWidth: 1100,
  props: {
    config: { collection: 'tickets', fields: ticketFields },
    adapters: pendingAdapters,
  },
}

export const live: RecordListExample = {
  name: 'Live update',
  summary:
    'Four tickets, and a fifth written by something else 2.5 seconds after mount. The list re-lists off `subscribe`; it never polls.',
  viewportWidth: 1100,
  props: {
    config: {
      collection: 'tickets',
      fields: ticketFields,
      sort: { field: 'date', direction: 'desc' },
      density: 'compact',
    },
    adapters: liveAdapters,
  },
}

export const invalidConfig: RecordListExample = {
  name: 'Invalid config',
  summary:
    'A field typed `currency`, which is not one of the eight. The card names it and lists them.',
  viewportWidth: 1100,
  props: {
    config: {
      collection: 'tickets',
      fields: [
        { key: 'ticket', label: 'Ticket', type: 'text', primary: true },
        { key: 'customer', label: 'Customer', type: 'text' },
        { key: 'quote', label: 'Quote', type: 'currency' },
      ],
    } as unknown as RecordListConfigInput,
    adapters: shopAdapters,
  },
}

export const recordListExamples = [
  table,
  cards,
  filteredAndSearched,
  empty,
  loading,
  live,
  invalidConfig,
]
