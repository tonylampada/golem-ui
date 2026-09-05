import type { GolemProps } from '../../abi'
import { fakeClock, fakeRecords, type FakeRecords } from '../../adapters/fake'
import type { ReportAdapters, ReportSlots } from './Report'
import type { ReportConfigInput } from './Report.config'

export type ReportProps = GolemProps<ReportConfigInput, ReportAdapters, ReportSlots>

export interface ReportExample {
  name: string
  summary: string
  props: ReportProps
  /** The width the example is meant to be read at; the story frames it there. */
  viewportWidth: number
  /** Forces the print stylesheet on screen, which is what the print-preview story shows. */
  printPreview?: boolean
}

/**
 * Adapters are built once, at module load, so props identity is stable: a component handed a new
 * adapter on every render would re-subscribe and re-fetch on every render.
 *
 * The reports are the daily write-up at Northgate Cycles, the invented bike shop the showcase is
 * set in. `TODAY` is the same frozen day the showcase's clock is set to, so the examples open on a
 * report rather than on an empty period.
 */

export const TODAY = new Date('2026-09-10T13:20:00Z')

/** A type rather than an interface, so it carries the implicit index signature `fakeRecords` takes. */
export type ShopReport = {
  id: string
  date: string
  title: string
  status: 'draft' | 'final'
  author: string
  sections: string[]
  body: string
}

export const reports: ShopReport[] = [
  {
    id: 'r-0910',
    date: '2026-09-10',
    title: 'Daily report — Thursday',
    status: 'draft',
    author: 'Northgate agent',
    sections: ['Where the week stands', 'Closed today', 'Still open', 'Worth a decision'],
    body: `Nine tickets closed this week and the average turnaround is 2.6 days, against the
three-day target set at the Friday stand-up. Two bikes are waiting for collection at the counter
and one is held for parts.

## Where the week stands

| Measure | This week | Target |
| --- | --- | --- |
| Tickets closed | 9 | 7 |
| Average turnaround | 2.6 days | 3 days |
| Waiting on parts | 1 | — |

## Closed today

- **#4186 Trek FX 3** — full tune-up, chain and cassette replaced, both brakes bled. Owen called at
  11:40 and collects after five.
- **#4184 Brompton M6L** — hinge clamp plate and all four cables. The fold is tight again.
- **#4183 Gazelle Ultimate C380** — the cut-out was a chafed speed-sensor lead, not the battery.
  Re-routed and taped, and the customer is watching it for a fortnight.

## Still open

- **#4187 Kona Rove** — rear wheel rebuild on the bench, three broken spokes on the drive side and
  the rim out by 4 mm. Spokes in stock.
- **#4185 Specialized Rockhopper** — fork lowers weeping. The SKF kit is quoted for Thursday.

## Worth a decision

The suspension bench is booked out to the 22nd and Priya is the only one certified on it. Either a
second pair of hands, or a longer lead time quoted at the counter.`,
  },
  {
    id: 'r-0909',
    date: '2026-09-09',
    title: 'Daily report — Wednesday',
    status: 'final',
    author: 'Northgate agent',
    sections: ['Closed today', 'Still open'],
    body: `Three tickets in, two out. The counter is clear for the first time since Monday.

## Closed today

- **#4182 Surly Long Haul Trucker** — bottom bracket swapped, half an hour on the bench.
- **#4181 Ribble Endurance SL** — full bleed on both brakes.

## Still open

- **#4185 Specialized Rockhopper** — booked in this morning, fork seals weeping. Quoted at $210 and
  approved by text.`,
  },
  {
    id: 'r-0908',
    date: '2026-09-08',
    title: 'Daily report — Tuesday',
    status: 'final',
    author: 'Northgate agent',
    sections: ['Closed today', 'Worth a decision'],
    body: `A quiet Tuesday. One collection, one booking, and the second wheel-building stand is
earning its shelf.

## Closed today

- **#4184 Brompton M6L** — collected at four.

## Worth a decision

The suspension bench is booked to the 22nd. Raised at the stand-up; no answer yet.`,
  },
  {
    id: 'r-0904',
    date: '2026-09-04',
    title: 'Weekly summary — first week of September',
    status: 'final',
    author: 'Northgate agent',
    sections: ['The week'],
    body: `## The week

Seven tickets closed, turnaround target agreed at three days and written onto the shop log. Winter
service pricing goes up at the counter on Monday.`,
  },
]

const clock = fakeClock(TODAY)

const shopAdapters: ReportAdapters = { records: fakeRecords({ reports }), clock }
const emptyAdapters: ReportAdapters = { records: fakeRecords({ reports: [] }), clock }

/**
 * A collection the agent is still writing to: two seconds after the component subscribes, the
 * report is rewritten and marked final. The document on screen replaces itself; nothing polls.
 */
function regeneratingRecords(): FakeRecords {
  const store = fakeRecords({ reports })

  return {
    ...store,
    subscribe(collection, listener) {
      const unsubscribe = store.subscribe(collection, listener)
      const timer = setTimeout(() => {
        void store.update('reports', 'r-0910', {
          status: 'final',
          title: 'Daily report — Thursday',
          body: `Rewritten by the agent while you were reading it: the Rockhopper fork kit landed
early and #4185 is back on the bench.

## Closed today

- **#4186 Trek FX 3** — full tune-up, collected.
- **#4184 Brompton M6L** — hinge and cables.
- **#4183 Gazelle Ultimate C380** — sensor lead re-routed.

## Still open

- **#4187 Kona Rove** — wheel rebuild, half done.
- **#4185 Specialized Rockhopper** — seals in, reassembly tomorrow morning.`,
        })
      }, 2000)
      return () => {
        clearTimeout(timer)
        unsubscribe()
      }
    },
  }
}

const liveAdapters: ReportAdapters = { records: regeneratingRecords(), clock }

/** The config every example starts from: the shop's daily write-up, in the shop's locale. */
const daily: ReportConfigInput = {
  collection: 'reports',
  period: 'day',
  dateField: 'date',
  titleField: 'title',
  bodyField: 'body',
  statusField: 'status',
  showAuthor: true,
  showIndex: true,
  print: true,
  emptyState: 'No report for this day. The agent writes one each morning from the week’s tickets.',
  locale: 'en-GB',
}

export const today: ReportExample = {
  name: 'Today',
  summary:
    'The latest report for the day the clock is set to, on a phone. Headings, a table and bullets out of one markdown field; the arrows step a day at a time.',
  viewportWidth: 390,
  props: { config: { ...daily, showIndex: false }, adapters: shopAdapters },
}

export const draft: ReportExample = {
  name: 'Draft',
  summary:
    'The same report at desktop width. `statusField` is `status`, and this one still says `draft`, so it wears the badge until the agent marks it final.',
  viewportWidth: 820,
  props: { config: daily, adapters: shopAdapters },
}

export const emptyPeriod: ReportExample = {
  name: 'Empty period',
  summary:
    'A collection with nothing in it: the `emptyState` line, with the arrows still there so the reader can step back to a day that has one.',
  viewportWidth: 820,
  props: { config: daily, adapters: emptyAdapters },
}

export const month: ReportExample = {
  name: 'Month, with the index',
  summary:
    'One period a month: the filter widens to every day in September and the latest report in it opens. The index under the document is every report, newest first.',
  viewportWidth: 820,
  props: { config: { ...daily, period: 'month' }, adapters: shopAdapters },
}

export const live: ReportExample = {
  name: 'Live update',
  summary:
    'The agent rewrites the open report two seconds after mount and marks it final. The body replaces itself off `subscribe`; the draft badge goes.',
  viewportWidth: 820,
  props: { config: { ...daily, showIndex: false }, adapters: liveAdapters },
}

export const printPreview: ReportExample = {
  name: 'Print preview',
  summary:
    'The print stylesheet forced on screen: no arrows, no print button, no index, and the card border gone. This is the sheet that comes out of Print / Save as PDF.',
  viewportWidth: 820,
  printPreview: true,
  props: { config: daily, adapters: shopAdapters },
}

export const invalidConfig: ReportExample = {
  name: 'Invalid config',
  summary:
    '`locale` written with an underscore, which no date on the page could be formatted with. The card names the field and shows the shape of a tag that works.',
  viewportWidth: 820,
  props: {
    config: { ...daily, locale: 'en_GB' },
    adapters: shopAdapters,
  },
}

export const reportExamples = [today, draft, emptyPeriod, month, live, printPreview, invalidConfig]
