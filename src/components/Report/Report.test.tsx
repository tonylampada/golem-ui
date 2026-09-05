import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeClock, fakeRecords } from '../../adapters/fake'
import { Report } from './Report'
import * as examples from './Report.examples'
import type { ReportConfigInput } from './Report.config'

/** Lets the adapter's promises land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const config = (over: Partial<ReportConfigInput> = {}): ReportConfigInput => ({
  collection: 'reports',
  statusField: 'status',
  ...over,
})

function mount(over: Partial<ReportConfigInput> = {}, id?: string) {
  const records = fakeRecords({ reports: examples.reports })
  const view = render(
    <Report
      config={config(over)}
      adapters={{ records, clock: fakeClock(examples.TODAY) }}
      id={id}
    />,
  )
  return { records, view }
}

const heading = () => screen.getByRole('heading', { level: 1 }).textContent
const period = () => document.querySelector('[data-golem-period]')?.textContent ?? ''

describe('Report', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.reportExamples) {
      const { unmount } = render(<Report {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('opens on the newest report in the current period', async () => {
    mount()
    await flush()

    // Three reports carry a September date; the 10th is the clock's day and the newest of them.
    expect(heading()).toBe('Daily report — Thursday')
    expect(screen.getByText(/Nine tickets closed this week/)).toBeInTheDocument()
  })

  it('picks the newest report of the period when the period is a month', async () => {
    mount({ period: 'month' })
    await flush()

    expect(period()).toBe('September 2026')
    expect(heading()).toBe('Daily report — Thursday')
  })

  it('steps the period back and forward, re-listing each time', async () => {
    mount()
    await flush()
    expect(period()).toBe('Thursday, 10 September 2026')

    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() => expect(heading()).toBe('Daily report — Wednesday'))
    expect(period()).toBe('Wednesday, 9 September 2026')

    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() => expect(heading()).toBe('Daily report — Tuesday'))

    await userEvent.click(screen.getByRole('button', { name: 'Next day' }))
    await waitFor(() => expect(heading()).toBe('Daily report — Wednesday'))
  })

  it('stops the next arrow at the period the clock is in', async () => {
    mount()
    await flush()
    expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled())
  })

  it('shows the empty-state line for a period with no report, arrows still there', async () => {
    mount()
    await flush()

    // The 5th and 6th are a weekend the shop wrote nothing on.
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))

    await waitFor(() => expect(screen.getByText(/No report for this period/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument()
  })

  it('replaces the body when the agent rewrites the report, without being asked to re-fetch', async () => {
    const { records } = mount()
    await flush()
    expect(screen.getByText(/Nine tickets closed this week/)).toBeInTheDocument()

    await act(async () => {
      await records.update('reports', 'r-0910', { body: 'Rewritten at noon.', status: 'final' })
    })

    await waitFor(() => expect(screen.getByText('Rewritten at noon.')).toBeInTheDocument())
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('badges a draft, and only while the status field says so', async () => {
    mount()
    await flush()
    expect(screen.getByText('Draft')).toBeInTheDocument()

    // Wednesday's report is final, so stepping back takes the badge away.
    await userEvent.click(screen.getByRole('button', { name: 'Previous day' }))
    await waitFor(() => expect(screen.queryByText('Draft')).not.toBeInTheDocument())
  })

  it('leaves every report unbadged when no statusField is configured', async () => {
    render(
      <Report
        config={{ collection: 'reports' }}
        adapters={{
          records: fakeRecords({ reports: examples.reports }),
          clock: fakeClock(examples.TODAY),
        }}
      />,
    )
    await flush()
    expect(screen.queryByText('Draft')).not.toBeInTheDocument()
  })

  it('opens a past report from the index and moves the period to it', async () => {
    mount({ showIndex: true })
    await flush()

    await userEvent.click(screen.getByRole('button', { name: /first week of September/ }))
    await waitFor(() => expect(heading()).toBe('Weekly summary — first week of September'))
    expect(period()).toBe('Friday, 4 September 2026')
  })

  it('renders the report the `id` prop names, on that report’s own period', async () => {
    mount({}, 'r-0908')
    await flush()

    expect(heading()).toBe('Daily report — Tuesday')
    await waitFor(() => expect(period()).toBe('Tuesday, 8 September 2026'))
  })

  it('prints through the browser, and offers no action when print is off', async () => {
    const print = vi.fn()
    vi.stubGlobal('print', print)

    const { view } = mount()
    await flush()
    await userEvent.click(screen.getByRole('button', { name: /print \/ save as pdf/i }))
    expect(print).toHaveBeenCalledTimes(1)

    view.rerender(
      <Report
        config={config({ print: false })}
        adapters={{
          records: fakeRecords({ reports: examples.reports }),
          clock: fakeClock(examples.TODAY),
        }}
      />,
    )
    await flush()
    expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('renders the markdown body as headings, a table and lists', async () => {
    mount()
    await flush()

    expect(screen.getByRole('heading', { level: 2, name: 'Closed today' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Measure' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '2.6 days' })).toBeInTheDocument()
  })

  it('renders an error card naming the locale that cannot format a date', () => {
    render(<Report {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('locale')
    expect(card).toHaveTextContent('en_GB')
    expect(card).toHaveTextContent('en-GB, en-US, pt-BR')
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('shows the adapter’s own message when the list rejects', async () => {
    const records = fakeRecords({ reports: examples.reports })
    render(
      <Report
        config={config()}
        adapters={{
          records: { ...records, list: () => Promise.reject(new Error('The archive is offline.')) },
          clock: fakeClock(examples.TODAY),
        }}
      />,
    )
    await flush()

    expect(screen.getByRole('alert')).toHaveTextContent('The archive is offline.')
  })
})
