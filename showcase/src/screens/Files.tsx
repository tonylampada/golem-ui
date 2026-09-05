import type { RecordsAdapter } from 'golem-ui'
import { useRows } from '../lib/use-rows'
import type { Attachment } from '../seed'
import { day, Panel, Screen, Tag } from '../ui'

const icon: Record<Attachment['kind'], string> = { photo: '🖼', pdf: '📄', audio: '🎧' }

/** Placeholder for the Upload component: files and photos, with a gallery. */
export function Files({ records }: { records: RecordsAdapter }) {
  const rows = useRows<Attachment>(records, 'attachments')

  return (
    <Screen
      title="Photos & invoices"
      lead="Dropped in from the counter or from a phone at the bench."
      action={
        <button
          type="button"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium"
        >
          Add a file
        </button>
      }
    >
      {rows.map((file) => (
        <Panel key={file.id}>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none">{icon[file.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {file.addedBy} · {day(file.date)} · {file.size}
              </p>
            </div>
            <Tag>{file.kind}</Tag>
          </div>
        </Panel>
      ))}
    </Screen>
  )
}
