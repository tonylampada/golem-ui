import { Report as ReportDocument } from 'golem-ui'
import type { ClockAdapter, RecordsAdapter, ReportConfigInput } from 'golem-ui'

/**
 * The shop's daily write-up. `/report` is the whole thing — arrows, index, print — and Today's
 * card is this same component with the chrome off; `dailyConfig` is the one both start from.
 */
export const dailyConfig: ReportConfigInput = {
  collection: 'reports',
  period: 'day',
  dateField: 'date',
  titleField: 'title',
  bodyField: 'body',
  statusField: 'status',
  authorField: 'author',
  showAuthor: true,
  showIndex: true,
  showNavigation: true,
  print: true,
  emptyState: 'No report for this day. The agent writes one each morning from the week’s tickets.',
  locale: 'en-GB',
}

/**
 * The same document on Today, with every piece of chrome off: the screen already carries the
 * navigation, and the reader prints from `/report`.
 */
export const cardConfig: ReportConfigInput = {
  ...dailyConfig,
  showIndex: false,
  showNavigation: false,
  print: false,
}

export function Report({ records, clock }: { records: RecordsAdapter; clock: ClockAdapter }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-7">
      <ReportDocument config={dailyConfig} adapters={{ records, clock }} />
    </div>
  )
}
