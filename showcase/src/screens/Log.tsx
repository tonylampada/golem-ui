import type { RecordsAdapter } from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { LogEntry } from '../seed'
import { day, Panel, Screen, Tag } from '../ui'

const kindLabel: Record<LogEntry['kind'], string> = {
  win: 'win',
  note: 'note',
  goal: 'goal',
}

/** Placeholder for the Timeline component: dated entries, filterable. */
export function Log({ records }: { records: RecordsAdapter }) {
  const entries = useRows<LogEntry>(records, 'log')

  return (
    <Screen title="Shop log" lead="What changed, in order, since the spring.">
      <Panel>
        <ol className="space-y-5">
          {entries.map((entry) => (
            <li key={entry.id} className="relative pl-6">
              <span className="absolute top-1.5 left-0 size-2.5 rounded-full bg-neutral-900" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-500">{day(entry.date)}</span>
                <Tag>{kindLabel[entry.kind]}</Tag>
              </div>
              <p className="mt-1 text-sm font-medium">{entry.label}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{entry.detail}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </Screen>
  )
}
