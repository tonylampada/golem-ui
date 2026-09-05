import { RecordList, Report, Timeline } from 'golem-ui'
import type {
  ClockAdapter,
  FilesAdapter,
  NavigationAdapter,
  RecordListConfigInput,
  RecordsAdapter,
} from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { RepairJob } from '../seed'
import { cardConfig } from './Report'
import { latestConfig } from './Log'
import { Panel, PanelTitle, Screen } from '../ui'

/**
 * The same component the Jobs screen uses, scoped to what is still open and cut to three rows —
 * one config away from the full board.
 */
const benchConfig: RecordListConfigInput = {
  collection: 'jobs',
  fields: [
    { key: 'ticket', label: 'Ticket', type: 'text', primary: true },
    { key: 'service', label: 'Service', type: 'text' },
    { key: 'customer', label: 'Customer', type: 'text' },
    { key: 'status', label: 'Status', type: 'enum' },
    { key: 'assignee', label: 'Mechanic', type: 'user' },
    { key: 'date', label: 'Booked in', type: 'date', format: 'short' },
  ],
  scope: { status: ['waiting', 'in progress'] },
  sort: { field: 'date', direction: 'desc' },
  pageSize: 3,
  emptyState: 'Nothing on the bench. Every ticket is ready to collect.',
  rowAction: 'open',
  density: 'compact',
}

/**
 * The screen the shop opens on. It is a composition, not a component: the report block becomes
 * Report, the ticket block becomes Record list, the log block becomes Timeline.
 */
export function Today({
  records,
  clock,
  files,
  navigation,
}: {
  records: RecordsAdapter
  clock: ClockAdapter
  files: FilesAdapter
  navigation: NavigationAdapter
}) {
  const jobs = useRows<RepairJob>(records, 'jobs')
  const onTheBench = jobs.filter((job) => job.status !== 'ready')
  const ready = jobs.filter((job) => job.status === 'ready')

  const today = clock.now().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: clock.timeZone(),
  })

  return (
    <Screen title="Today" lead={today}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'On the bench', value: onTheBench.length },
          { label: 'Ready to collect', value: ready.length },
          { label: 'Closed this week', value: 9 },
          { label: 'Avg turnaround', value: '2.6 d' },
        ].map((stat) => (
          <Panel key={stat.label} className="px-3 py-3">
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 text-xs text-neutral-500">{stat.label}</p>
          </Panel>
        ))}
      </div>

      {/* The same Report that fills `/report`, with the arrows, the index and the print action
          off — the screen around it already carries all three. */}
      <section>
        <PanelTitle
          aside={
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => navigation.go('/report')}
            >
              Open
            </button>
          }
        >
          Daily report
        </PanelTitle>
        <Report config={cardConfig} adapters={{ records, clock }} />
      </section>

      <Panel>
        <PanelTitle
          aside={
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => navigation.go('/jobs')}
            >
              All tickets
            </button>
          }
        >
          On the bench
        </PanelTitle>
        <RecordList
          config={benchConfig}
          adapters={{ records }}
          onOpen={(row) => navigation.go(`/jobs/${String(row.id)}`)}
        />
      </Panel>

      <Panel>
        <PanelTitle
          aside={
            <button
              type="button"
              className="underline-offset-2 hover:underline"
              onClick={() => navigation.go('/log')}
            >
              Full log
            </button>
          }
        >
          Latest on the log
        </PanelTitle>
        {/* The same Timeline that fills `/log`, cut to three entries with no chips and no
            composer — the block is a glance at the log rather than the log. */}
        <Timeline config={latestConfig} adapters={{ records, clock, files }} />
      </Panel>
    </Screen>
  )
}
