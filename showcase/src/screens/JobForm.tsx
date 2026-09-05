import { useEffect, useMemo, useState } from 'react'
import { RecordForm } from 'golem-ui'
import type {
  IdentityAdapter,
  NavigationAdapter,
  RecordFormConfigInput,
  RecordsAdapter,
  User,
} from 'golem-ui'
import { Screen } from '../ui'

/** The role the shop lets delete a ticket. Everyone else edits and saves. */
const DELETE_ROLE = 'owner'

const STATUS_OPTIONS = [
  { id: 'waiting', label: 'Waiting for parts' },
  { id: 'in progress', label: 'On the bench' },
  { id: 'ready', label: 'Ready for pickup' },
]

/**
 * One field list for both routes. The ticket number is the shop's own, written when the bike comes
 * in and never touched again, so it is required on create and read-only on edit.
 */
function fieldsFor(editing: boolean): RecordFormConfigInput['fields'] {
  return [
    {
      key: 'ticket',
      label: 'Ticket',
      type: 'text',
      required: !editing,
      readOnly: editing,
      placeholder: '#4188',
      help: editing ? undefined : 'The number on the tag that goes on the bars.',
    },
    { key: 'customer', label: 'Customer', type: 'text', required: true, placeholder: 'Owen Pratt' },
    { key: 'bike', label: 'Bike', type: 'text', required: true, placeholder: 'Trek FX 3' },
    {
      key: 'service',
      label: 'Service',
      type: 'text',
      required: true,
      placeholder: 'Rear wheel rebuild',
    },
    { key: 'status', label: 'Status', type: 'enum', required: true, options: STATUS_OPTIONS },
    { key: 'assignee', label: 'Mechanic', type: 'user', users: 'members' },
    { key: 'date', label: 'Booked in', type: 'date', required: true, min: '2026-01-01' },
    {
      key: 'quote',
      label: 'Quote',
      type: 'money',
      format: 'USD',
      min: 0,
      max: 5000,
      help: 'What the customer was told on the phone.',
    },
    { key: 'hours', label: 'Bench hours', type: 'number', format: '2', min: 0, max: 40 },
    { key: 'approved', label: 'Price approved', type: 'boolean' },
    {
      key: 'notes',
      label: 'Notes',
      type: 'text',
      multiline: true,
      placeholder: 'What you found once it was on the stand.',
    },
  ]
}

/** Who is signed in, so the config can decide whether Delete is on the bar. */
function useSignedIn(identity: IdentityAdapter): User | null {
  const [user, setUser] = useState<User | null>(null)
  useEffect(() => {
    let live = true
    void identity.currentUser().then((next) => {
      if (live) setUser(next)
    })
    const unsubscribe = identity.subscribe(setUser)
    return () => {
      live = false
      unsubscribe()
    }
  }, [identity])
  return user
}

export function JobForm({
  id,
  records,
  identity,
  navigation,
}: {
  /** The ticket being edited, or absent for the new-ticket route. */
  id?: string
  records: RecordsAdapter
  identity: IdentityAdapter
  navigation: NavigationAdapter
}) {
  const user = useSignedIn(identity)
  const editing = id !== undefined
  const mayDelete = editing && (user?.roles.includes(DELETE_ROLE) ?? false)

  const config = useMemo<RecordFormConfigInput>(
    () => ({
      collection: 'jobs',
      fields: fieldsFor(editing),
      mode: editing ? 'edit' : 'create',
      layout: 'two-column',
      submitLabel: editing ? 'Save the ticket' : 'Book the bike in',
      cancel: 'back',
      successMessage: editing ? 'Ticket updated.' : 'Ticket written to the board.',
      deleteAllowed: mayDelete,
    }),
    [editing, mayDelete],
  )

  const adapters = useMemo(() => ({ records, identity }), [records, identity])

  return (
    <Screen
      title={editing ? 'Ticket' : 'New ticket'}
      lead={
        editing
          ? 'The board shows the change the moment it is saved.'
          : 'One config, written straight into the jobs collection.'
      }
    >
      <RecordForm
        config={config}
        adapters={adapters}
        recordId={id}
        onDone={() => navigation.go('/jobs')}
        onCancel={() => navigation.go('/jobs')}
      />
    </Screen>
  )
}
