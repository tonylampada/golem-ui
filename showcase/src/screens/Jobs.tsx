import type { NavigationAdapter, RecordsAdapter } from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { RepairJob } from '../seed'
import { day, Panel, Screen, Tag } from '../ui'

/** Placeholder for the Record list component. */
export function Jobs({
  records,
  navigation,
}: {
  records: RecordsAdapter
  navigation: NavigationAdapter
}) {
  const rows = useRows<RepairJob>(records, 'jobs')

  return (
    <Screen
      title="Repair jobs"
      lead={`${rows.length} tickets on the board`}
      action={
        <button
          type="button"
          onClick={() => navigation.go('/jobs/new')}
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          New ticket
        </button>
      }
    >
      {rows.map((job) => (
        <Panel key={job.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {job.ticket} · {job.service}
              </p>
              <p className="mt-0.5 truncate text-sm text-neutral-500">
                {job.customer} — {job.bike}
              </p>
            </div>
            <Tag tone={job.status}>{job.status}</Tag>
          </div>
          <p className="mt-3 text-sm text-neutral-700">{job.notes}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
            <span>{day(job.date)}</span>
            <span>{job.assignee}</span>
            <span>{job.quote}</span>
            {job.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </Panel>
      ))}
    </Screen>
  )
}
