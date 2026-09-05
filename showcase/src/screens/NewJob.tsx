import { useState } from 'react'
import type { NavigationAdapter, RecordsAdapter } from 'golem-ui'
import { Panel, Screen } from '../ui'

const fields = [
  { name: 'customer', label: 'Customer', placeholder: 'Delia Marchetti' },
  { name: 'bike', label: 'Bike', placeholder: 'Kona Rove, 2019' },
  { name: 'service', label: 'Service', placeholder: 'Rear wheel rebuild' },
  { name: 'quote', label: 'Quote', placeholder: '$140' },
] as const

/** Placeholder for the Record form component. */
export function NewJob({
  records,
  navigation,
}: {
  records: RecordsAdapter
  navigation: NavigationAdapter
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')

  const submit = () => {
    void records
      .create('jobs', {
        ticket: `#${4188 + Math.floor(Math.random() * 12)}`,
        date: new Date().toISOString().slice(0, 10),
        assignee: 'Nadia Kessler',
        status: 'waiting',
        notes,
        tags: ['new'],
        ...values,
      })
      .then(() => navigation.go('/jobs'))
  }

  return (
    <Screen title="New ticket" lead="Written straight into the jobs collection.">
      <Panel>
        <div className="space-y-4">
          {fields.map((field) => (
            <label key={field.name} className="block">
              <span className="text-sm font-medium text-neutral-700">{field.label}</span>
              <input
                type="text"
                placeholder={field.placeholder}
                value={values[field.name] ?? ''}
                onChange={(event) =>
                  setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                }
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              />
            </label>
          ))}
          <label className="block">
            <span className="text-sm font-medium text-neutral-700">Notes</span>
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submit}
              className="flex-1 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white sm:flex-none"
            >
              Save ticket
            </button>
            <button
              type="button"
              onClick={() => navigation.go('/jobs')}
              className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Panel>
    </Screen>
  )
}
