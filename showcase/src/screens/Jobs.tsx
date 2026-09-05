import { RecordList } from 'golem-ui'
import type { NavigationAdapter, RecordListConfigInput, RecordsAdapter } from 'golem-ui'
import { Screen } from '../ui'

/** Every column a ticket has, in the order the shop reads them. */
const config: RecordListConfigInput = {
  collection: 'jobs',
  fields: [
    { key: 'ticket', label: 'Ticket', type: 'text', primary: true },
    { key: 'service', label: 'Service', type: 'text' },
    { key: 'customer', label: 'Customer', type: 'text' },
    { key: 'bike', label: 'Bike', type: 'text' },
    { key: 'status', label: 'Status', type: 'enum' },
    { key: 'assignee', label: 'Mechanic', type: 'user' },
    { key: 'date', label: 'Booked in', type: 'date', format: 'medium' },
    { key: 'quote', label: 'Quote', type: 'money', format: 'USD' },
  ],
  sort: { field: 'date', direction: 'desc' },
  filters: ['status', 'assignee'],
  search: ['ticket', 'customer', 'bike', 'service'],
  pageSize: 3,
  emptyState: 'No tickets match. Clear the search or the filters.',
  rowAction: 'open',
  density: 'comfortable',
}

export function Jobs({
  records,
  navigation,
}: {
  records: RecordsAdapter
  navigation: NavigationAdapter
}) {
  return (
    <Screen
      title="Repair jobs"
      lead="Everything on the board, newest first."
      wide
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
      <RecordList
        config={config}
        adapters={{ records }}
        onOpen={(row) => navigation.go(`/jobs/${String(row.id)}`)}
      />
    </Screen>
  )
}
