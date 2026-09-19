import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeIdentity, fakeRecords, type FakeRecords } from '../../adapters/fake'
import { RecordForm } from './RecordForm'
import * as examples from './RecordForm.examples'
import type { RecordFormConfigInput } from './RecordForm.config'

/** Lets the adapter's promises land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const identity = fakeIdentity({ members: examples.mechanics })

const config = (over: Partial<RecordFormConfigInput> = {}): RecordFormConfigInput => ({
  collection: 'jobs',
  fields: examples.ticketFields,
  mode: 'create',
  ...over,
})

interface MountOptions {
  over?: Partial<RecordFormConfigInput>
  records?: FakeRecords
  recordId?: string
  onDone?: (row: unknown) => void
  onCancel?: () => void
}

async function mount({ over, records, recordId, onDone, onCancel }: MountOptions = {}) {
  const store = records ?? fakeRecords({ jobs: [examples.ticket] })
  render(
    <RecordForm
      config={config(over)}
      adapters={{ records: store, identity }}
      recordId={recordId}
      onDone={onDone}
      onCancel={onCancel}
    />,
  )
  await flush()
  return store
}

const rows = (store: FakeRecords) => store.list<Record<string, unknown>>('jobs')

describe('RecordForm', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.recordFormExamples) {
      const { unmount } = render(<RecordForm {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('blocks submit on a missing required value and focuses the field that is missing', async () => {
    const store = await mount()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Customer is required.')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByLabelText(/^Customer/))
    expect((await rows(store)).rows).toHaveLength(1)
  })

  it('offers enum labels and writes the option id', async () => {
    const store = await mount({ records: fakeRecords({ jobs: [] }) })

    const status = screen.getByLabelText(/^Status/)
    expect(screen.getByRole('option', { name: 'On the bench' })).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/^Customer/), 'Bram Ostrowski')
    await userEvent.type(screen.getByLabelText(/^Bike/), 'Cannondale Topstone')
    await userEvent.type(screen.getByLabelText(/^Service/), 'Brake bleed')
    await userEvent.selectOptions(status, 'in progress')
    await userEvent.type(screen.getByLabelText(/^Booked in/), '2026-09-11')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(async () => expect((await rows(store)).rows).toHaveLength(1))
    expect((await rows(store)).rows[0]).toMatchObject({
      customer: 'Bram Ostrowski',
      status: 'in progress',
    })
  })

  it('lands the adapter’s refusal under the field it names', async () => {
    const refusing = fakeRecords(
      { jobs: [examples.ticket] },
      { refuse: { field: 'quote', message: 'A quote over $500 needs the owner.' } },
    )
    await mount({ over: { mode: 'edit' }, records: refusing, recordId: 'j-4187' })

    await userEvent.clear(screen.getByLabelText(/^Quote/))
    await userEvent.type(screen.getByLabelText(/^Quote/), '900')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(screen.getByText('A quote over $500 needs the owner.')).toBeInTheDocument(),
    )
    expect(document.activeElement).toBe(screen.getByLabelText(/^Quote/))
    // The optimistic success line is taken back when the write is refused.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('loads the record in edit mode, then updates it', async () => {
    const onDone = vi.fn()
    const store = await mount({ over: { mode: 'edit' }, recordId: 'j-4187', onDone })

    expect(screen.getByLabelText(/^Customer/)).toHaveValue('Delia Marchetti')
    expect(screen.getByLabelText(/^Status/)).toHaveValue('in progress')

    await userEvent.clear(screen.getByLabelText(/^Service/))
    await userEvent.type(screen.getByLabelText(/^Service/), 'Full service')
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))

    expect(await store.get('jobs', 'j-4187')).toMatchObject({ service: 'Full service' })
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('asks before deleting, and only then calls remove', async () => {
    const onDone = vi.fn()
    const store = await mount({
      over: { mode: 'edit', deleteAllowed: true },
      recordId: 'j-4187',
      onDone,
    })

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect((await rows(store)).rows).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect((await rows(store)).rows).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete permanently' }))

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null))
    expect((await rows(store)).rows).toHaveLength(0)
  })

  it('asks before throwing away unsaved changes, and leaves at once when there are none', async () => {
    const onCancel = vi.fn()
    await mount({ over: { mode: 'edit' }, recordId: 'j-4187', onCancel })

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await userEvent.type(screen.getByLabelText(/^Customer/), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByText('You have changes that have not been saved.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Discard them' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('keeps read-only fields out of the patch and shows them formatted', async () => {
    const store = fakeRecords({ jobs: [examples.ticket] })
    render(
      <RecordForm {...examples.readOnlyFields.props} adapters={{ records: store, identity }} />,
    )
    await flush()

    // A read-only field has no control at all, only the formatted value.
    expect(screen.queryByRole('textbox', { name: /^Ticket/ })).not.toBeInTheDocument()
    expect(screen.getByText('#4187')).toBeInTheDocument()
    expect(screen.getByText(/10 Sept? 2026/)).toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText(/^Quote/))
    await userEvent.type(screen.getByLabelText(/^Quote/), '175')
    await userEvent.click(screen.getByRole('button', { name: 'Save the ticket' }))

    await waitFor(async () =>
      expect(await store.get('jobs', 'j-4187')).toMatchObject({ quote: 175 }),
    )
    expect(await store.get('jobs', 'j-4187')).toMatchObject({ ticket: '#4187' })
  })

  it('sends the version it loaded, in the configured field, and advances it after a save', async () => {
    const store = fakeRecords({ jobs: [{ ...examples.ticket, rev: 4 }] })
    const update = vi.spyOn(store, 'update')
    await mount({ over: { mode: 'edit', versionField: 'rev' }, records: store, recordId: 'j-4187' })

    await userEvent.type(screen.getByLabelText(/^Service/), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenLastCalledWith(
      'jobs',
      'j-4187',
      { service: 'Rear wheel rebuild!', rev: 5 },
      { expectedVersion: 4, versionField: 'rev' },
    )

    await userEvent.type(screen.getByLabelText(/^Service/), '?')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update.mock.lastCall![3]).toEqual({ expectedVersion: 5, versionField: 'rev' })
  })

  it('writes an unversioned record with a plain patch', async () => {
    const store = fakeRecords({ jobs: [examples.ticket] })
    const update = vi.spyOn(store, 'update')
    await mount({ over: { mode: 'edit' }, records: store, recordId: 'j-4187' })

    await userEvent.type(screen.getByLabelText(/^Service/), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update).toHaveBeenLastCalledWith('jobs', 'j-4187', { service: 'Rear wheel rebuild!' })
  })

  it('stops a stale save, keeps the unsaved values, and lets the reader pick a side', async () => {
    const store = fakeRecords({ jobs: [{ ...examples.ticket, version: 1 }] })
    const onCancel = vi.fn()
    render(
      <>
        {['first', 'second'].map((who) => (
          <section key={who} aria-label={who}>
            <RecordForm
              config={config({ mode: 'edit' })}
              adapters={{ records: store, identity }}
              recordId="j-4187"
              onCancel={onCancel}
            />
          </section>
        ))}
      </>,
    )
    await flush()
    const first = within(screen.getByRole('region', { name: 'first' }))
    const second = within(screen.getByRole('region', { name: 'second' }))
    const saved = () => store.get<Record<string, unknown>>('jobs', 'j-4187')

    // The first writer changes the bike and the service; the second, the service and the quote.
    await userEvent.type(first.getByLabelText(/^Bike/), ' (green)')
    await userEvent.clear(first.getByLabelText(/^Service/))
    await userEvent.type(first.getByLabelText(/^Service/), 'Wheel truing')
    await userEvent.click(first.getByRole('button', { name: 'Save' }))
    await waitFor(async () => expect(await saved()).toMatchObject({ version: 2 }))

    await userEvent.clear(second.getByLabelText(/^Service/))
    await userEvent.type(second.getByLabelText(/^Service/), 'New rim')
    await userEvent.clear(second.getByLabelText(/^Quote/))
    await userEvent.type(second.getByLabelText(/^Quote/), '210')
    await userEvent.click(second.getByRole('button', { name: 'Save' }))

    const dialog = await second.findByRole('alertdialog', { name: 'Saved by someone else' })
    expect(within(dialog).getByText('Kona Rove, 2019 (green)')).toBeInTheDocument()
    expect(within(dialog).getByText('Wheel truing')).toBeInTheDocument()
    expect(within(dialog).queryByText(/^Version/)).not.toBeInTheDocument()
    // The second writer never touched the bike, so Keep mine would not write it either.
    expect(within(dialog).getByText('not changed')).toBeInTheDocument()
    expect(second.getByLabelText(/^Service/)).toHaveValue('New rim')
    expect(second.queryByRole('status')).not.toBeInTheDocument()
    expect(await saved()).toMatchObject({ service: 'Wheel truing', version: 2 })

    // Cancel still asks first, and keeping on editing brings the choice back.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await userEvent.click(second.getByRole('button', { name: 'Keep editing' }))
    expect(onCancel).not.toHaveBeenCalled()

    // Another write lands before the reader chooses, so keeping theirs meets a newer version.
    await store.update('jobs', 'j-4187', { notes: 'Rim tape arrived.', version: 3 })
    await userEvent.click(second.getByRole('button', { name: 'Keep mine' }))
    await second.findByText('Rim tape arrived.')
    expect(second.getByLabelText(/^Quote/)).toHaveValue(210)
    expect(await saved()).toMatchObject({ version: 3, service: 'Wheel truing' })

    await userEvent.click(second.getByRole('button', { name: 'Keep mine' }))
    await waitFor(async () => expect(await saved()).toMatchObject({ version: 4 }))
    // Only what the second writer changed was written; the bike and the notes survive.
    expect(await saved()).toMatchObject({
      bike: 'Kona Rove, 2019 (green)',
      notes: 'Rim tape arrived.',
      service: 'New rim',
      quote: 210,
    })

    // The first form is now stale; taking theirs shows the stored record with nothing unsaved.
    await userEvent.type(first.getByLabelText(/^Customer/), '!')
    await userEvent.click(first.getByRole('button', { name: 'Save' }))
    await first.findByRole('alertdialog', { name: 'Saved by someone else' })
    await userEvent.click(first.getByRole('button', { name: 'Take theirs' }))
    expect(first.getByLabelText(/^Service/)).toHaveValue('New rim')
    expect(first.getByLabelText(/^Customer/)).toHaveValue('Delia Marchetti')
    expect(first.queryByText('Unsaved changes')).not.toBeInTheDocument()
    expect(await saved()).toMatchObject({ customer: 'Delia Marchetti', version: 4 })
  })

  it('checks the form again before Keep mine, and keeps the choice open while it fails', async () => {
    const store = fakeRecords({ jobs: [{ ...examples.ticket, version: 1 }] })
    const update = vi.spyOn(store, 'update')
    await mount({ over: { mode: 'edit' }, records: store, recordId: 'j-4187' })
    await store.update('jobs', 'j-4187', { bike: 'Kona Rove, 2020', version: 2 })
    update.mockClear()

    await userEvent.type(screen.getByLabelText(/^Service/), '!')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alertdialog', { name: 'Saved by someone else' })

    await userEvent.clear(screen.getByLabelText(/^Customer/))
    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(screen.getByText('Customer is required.')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByLabelText(/^Customer/))
    expect(screen.getByRole('alertdialog', { name: 'Saved by someone else' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Service/)).toHaveValue('Rear wheel rebuild!')
    expect(update).toHaveBeenCalledTimes(1)

    await userEvent.type(screen.getByLabelText(/^Customer/), 'Delia Marchetti-Ross')
    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2))
    expect(update.mock.lastCall![3]).toEqual({ expectedVersion: 2, versionField: 'version' })
    expect(await store.get('jobs', 'j-4187')).toMatchObject({
      customer: 'Delia Marchetti-Ross',
      service: 'Rear wheel rebuild!',
      bike: 'Kona Rove, 2020',
      version: 3,
    })
  })

  it('renders an error card naming the enum field with no options', () => {
    render(<RecordForm {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('fields.1.options')
    expect(card).toHaveTextContent('no `options`')
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })
})
