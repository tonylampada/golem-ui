import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeClock, fakeIdentity, fakeRecords } from '../../adapters/fake'
import { Timeline } from './Timeline'
import * as examples from './Timeline.examples'
import type { TimelineAdapters } from './Timeline'
import type { TimelineConfigInput } from './Timeline.config'

/** Lets the adapter's `list()` promise land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const config = (over: Partial<TimelineConfigInput> = {}): TimelineConfigInput => ({
  collection: 'log',
  dateField: 'at',
  bodyField: 'body',
  kindField: 'kind',
  kinds: examples.shopKinds,
  actorField: 'actor',
  ...over,
})

function mount(over: Partial<TimelineConfigInput> = {}, adapters?: Partial<TimelineAdapters>) {
  const records = fakeRecords({ log: examples.shopLog })
  const clock = fakeClock(examples.NOW)
  const view = render(<Timeline config={config(over)} adapters={{ records, clock, ...adapters }} />)
  return { records, clock, view }
}

/** The day headers on screen, top to bottom. */
const dayHeaders = () =>
  Array.from(document.querySelectorAll('[data-golem-day] > h3')).map(
    (heading) => heading.textContent ?? '',
  )

/** The entry ids on screen, top to bottom. */
const entryIds = () =>
  Array.from(document.querySelectorAll('[data-golem-entry]')).map(
    (entry) => entry.getAttribute('data-golem-entry') ?? '',
  )

const feed = () => document.querySelector<HTMLElement>('[data-golem-feed]')!

describe('Timeline', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.timelineExamples) {
      const { unmount } = render(<Timeline {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('cuts the entries into days, newest first, under one header each', async () => {
    mount()
    await flush()

    expect(dayHeaders()).toEqual([
      'Today',
      'Yesterday',
      'Tuesday 8 September',
      'Monday 7 September',
      'Friday 4 September',
    ])
    expect(entryIds()[0]).toBe('e-31')

    // Every entry of a day sits under that day's header, and no day is headed twice.
    const days = document.querySelectorAll('[data-golem-day]')
    expect(days).toHaveLength(5)
    expect(days[0]!.querySelectorAll('[data-golem-entry]')).toHaveLength(4)
  })

  it('reads today as how long ago and every other day as a clock time', async () => {
    mount()
    await flush()

    // The clock is frozen at 13:20Z; the newest entry was written at 13:06Z.
    const today = document.querySelectorAll('[data-golem-day]')[0]!
    expect(today.querySelectorAll('time')[0]).toHaveTextContent('14 min ago')
    expect(today.querySelectorAll('time')[1]).toHaveTextContent('1 hour ago')
    expect(today.querySelectorAll('time')[3]).toHaveTextContent('5 hours ago')

    const yesterday = document.querySelectorAll('[data-golem-day]')[1]!
    expect(yesterday.querySelectorAll('time')[0]).toHaveTextContent('16:20')
  })

  it('narrows the log to one kind when a chip is chosen', async () => {
    mount({ filters: ['kind'] })
    await flush()
    expect(entryIds()).toHaveLength(12)

    await userEvent.click(screen.getByRole('button', { name: 'Problem' }))
    await waitFor(() => expect(entryIds()).toEqual(['e-29', 'e-23']))

    // The chips offer the whole configured vocabulary, so the reader can always get back out.
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(() => expect(entryIds()).toHaveLength(12))
  })

  it('appends older entries under the ones already read', async () => {
    mount({ pageSize: 5 })
    await flush()
    expect(entryIds()).toHaveLength(5)

    await userEvent.click(screen.getByRole('button', { name: /load 5 older/i }))
    await waitFor(() => expect(entryIds()).toHaveLength(10))
    expect(entryIds()[0]).toBe('e-31')

    await userEvent.click(screen.getByRole('button', { name: /load 5 older/i }))
    await waitFor(() => expect(entryIds()).toHaveLength(12))
    expect(screen.queryByRole('button', { name: /load 5 older/i })).not.toBeInTheDocument()
  })

  it('puts a live entry on top, and counts it in a pill when the reader has scrolled down', async () => {
    const { records } = mount()
    await flush()

    // At the top: the entry arrives and there is nothing to announce.
    await act(async () => {
      records.insert('log', { at: '2026-09-10T13:18:00Z', kind: 'note', body: 'Kettle on.' })
    })
    await waitFor(() => expect(entryIds()[0]).toBe('fake-1'))
    expect(document.querySelector('[data-golem-new-pill]')).not.toBeInTheDocument()

    // Scrolled down, reading something older: the next arrival is news rather than a jump.
    const box = feed()
    Object.defineProperty(box, 'scrollTop', { value: 400, writable: true })
    await act(async () => {
      box.dispatchEvent(new Event('scroll'))
    })
    await act(async () => {
      records.insert('log', { at: '2026-09-10T13:19:00Z', kind: 'done', body: 'Wheel is true.' })
    })

    const pill = await screen.findByRole('button', { name: /1 new entry/ })
    expect(entryIds()[0]).toBe('fake-2')

    // Clicking it takes the reader back to the newest entry and clears the count.
    await userEvent.click(pill)
    expect(box.scrollTop).toBe(0)
    await waitFor(() =>
      expect(document.querySelector('[data-golem-new-pill]')).not.toBeInTheDocument(),
    )
  })

  it('writes what the composer holds, stamped with the clock and the signed-in member', async () => {
    const records = fakeRecords({ log: examples.shopLog.slice(0, 2) })
    const create = vi.spyOn(records, 'create')
    render(
      <Timeline
        config={config({ composer: true })}
        adapters={{
          records,
          clock: fakeClock(examples.NOW),
          identity: fakeIdentity({ user: examples.members[0], members: examples.members }),
        }}
      />,
    )
    await flush()

    await userEvent.type(screen.getByLabelText('Add an entry'), 'Kona rebuild off the stand.')
    await userEvent.selectOptions(screen.getByLabelText('Kind'), 'done')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0]![1]).toEqual({
      at: '2026-09-10T13:20:00.000Z',
      body: 'Kona rebuild off the stand.',
      kind: 'done',
      actor: 'Nadia Kessler',
    })

    // It comes back through `subscribe`, so the reader sees it without a reload.
    await waitFor(() => expect(screen.getByText('Kona rebuild off the stand.')).toBeInTheDocument())
    expect(screen.getByLabelText('Add an entry')).toHaveValue('')
  })

  it('shows the empty-state line when nothing matches', async () => {
    render(
      <Timeline
        config={config({ emptyState: 'Nothing on the log yet.' })}
        adapters={{ records: fakeRecords({ log: [] }), clock: fakeClock(examples.NOW) }}
      />,
    )
    await flush()

    expect(screen.getByText('Nothing on the log yet.')).toBeInTheDocument()
  })

  it('renders an error card naming the kind with an unknown tone', () => {
    render(<Timeline {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('kinds.1.tone')
    expect(card).toHaveTextContent('Unknown tone "info"')
    expect(card).toHaveTextContent('neutral, good, warn, bad')
    expect(document.querySelector('[data-golem-entry]')).not.toBeInTheDocument()
  })

  it('rejects a filter whose field is not configured, so a chip row is never empty by surprise', () => {
    render(
      <Timeline
        config={{ collection: 'log', filters: ['kind'] }}
        adapters={{ records: fakeRecords({ log: [] }), clock: fakeClock(examples.NOW) }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('kindField')
  })
})
