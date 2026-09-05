import { useMemo } from 'react'
import type { NavigationAdapter, RecordsAdapter } from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { RepairJob } from '../seed'
import { day, Panel, PanelTitle, Screen, Tag } from '../ui'

/** Placeholder for the Record form component: where a row from the job list opens. */
export function Job({
  id,
  records,
  navigation,
}: {
  id: string
  records: RecordsAdapter
  navigation: NavigationAdapter
}) {
  // The list adapter is the only way in, so one ticket is a one-row query. Memoised because
  // `useRows` re-lists whenever the query object changes identity.
  const query = useMemo(() => ({ filter: { id }, limit: 1 }), [id])
  const [job] = useRows<RepairJob>(records, 'jobs', query)

  if (!job) {
    return (
      <Screen title="Ticket" lead="Nothing on the board with that number.">
        <Panel>
          <button
            type="button"
            onClick={() => navigation.go('/jobs')}
            className="text-sm font-medium underline underline-offset-2"
          >
            Back to the board
          </button>
        </Panel>
      </Screen>
    )
  }

  return (
    <Screen
      title={`${job.ticket} · ${job.service}`}
      lead={`${job.customer} — ${job.bike}`}
      action={
        <button
          type="button"
          onClick={() => navigation.go('/jobs')}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Back
        </button>
      }
    >
      <Panel>
        <PanelTitle aside={<Tag tone={job.status}>{job.status}</Tag>}>On the ticket</PanelTitle>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {[
            ['Mechanic', job.assignee],
            ['Booked in', day(job.date)],
            ['Quote', `$${job.quote}`],
            ['Bench hours', String(job.hours)],
            ['Price approved', job.approved ? 'Yes' : 'No'],
          ].map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="min-w-0">{value}</dd>
            </div>
          ))}
        </dl>
      </Panel>

      <Panel>
        <PanelTitle>Notes</PanelTitle>
        <p className="text-sm leading-relaxed text-neutral-700">{job.notes}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      </Panel>
    </Screen>
  )
}
