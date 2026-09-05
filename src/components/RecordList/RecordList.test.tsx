import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeRecords } from '../../adapters/fake'
import { RecordList } from './RecordList'
import * as examples from './RecordList.examples'
import type { RecordListConfigInput } from './RecordList.config'

/** Lets the adapter's `list()` promise land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const config = (over: Partial<RecordListConfigInput> = {}): RecordListConfigInput => ({
  collection: 'tickets',
  fields: examples.ticketFields,
  ...over,
})

function mount(over: Partial<RecordListConfigInput> = {}, onOpen?: (row: unknown) => void) {
  const records = fakeRecords({ tickets: examples.tickets })
  const view = render(<RecordList config={config(over)} adapters={{ records }} onOpen={onOpen} />)
  return { records, view }
}

/** The ticket column of every body row, in the order they are shown. */
const ticketColumn = () =>
  Array.from(document.querySelectorAll('tbody [data-golem-row]')).map(
    (row) => row.querySelector('td')?.textContent ?? '',
  )

describe('RecordList', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.recordListExamples) {
      const { unmount } = render(<RecordList {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('toggles the sort when a column heading is clicked twice', async () => {
    mount({ sort: { field: 'quote', direction: 'asc' } })
    await flush()

    expect(ticketColumn()[0]).toBe('#4182')
    const heading = screen.getByRole('columnheader', { name: /quote/i })
    expect(heading).toHaveAttribute('aria-sort', 'ascending')

    await userEvent.click(within(heading).getByRole('button'))
    await waitFor(() => expect(ticketColumn()[0]).toBe('#4181'))
    expect(heading).toHaveAttribute('aria-sort', 'descending')

    await userEvent.click(within(heading).getByRole('button'))
    await waitFor(() => expect(ticketColumn()[0]).toBe('#4182'))
    expect(heading).toHaveAttribute('aria-sort', 'ascending')
  })

  it('narrows the list to one value when a filter chip is chosen', async () => {
    mount({ filters: ['status'] })
    await flush()
    expect(ticketColumn()).toHaveLength(7)

    await userEvent.click(screen.getByRole('button', { name: 'waiting' }))
    await waitFor(() => expect(ticketColumn()).toEqual(['#4185', '#4181']))

    // The chips still offer every value seen, so the reader can get back out.
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(() => expect(ticketColumn()).toHaveLength(7))
  })

  it('searches across every listed field, and not across the others', async () => {
    mount({ search: ['customer', 'bike'] })
    await flush()

    const box = screen.getByRole('searchbox')
    await userEvent.type(box, 'rockhopper')
    await waitFor(() => expect(ticketColumn()).toEqual(['#4185']))

    await userEvent.clear(box)
    await userEvent.type(box, 'owen')
    await waitFor(() => expect(ticketColumn()).toEqual(['#4186']))

    // `ticket` is not in `search`, so a ticket number matches nothing.
    await userEvent.clear(box)
    await userEvent.type(box, '4187')
    await waitFor(() => expect(ticketColumn()).toEqual([]))
  })

  it('appends the next page instead of replacing the first', async () => {
    mount({ pageSize: 3, sort: { field: 'date', direction: 'desc' } })
    await flush()
    expect(ticketColumn()).toEqual(['#4187', '#4186', '#4185'])

    await userEvent.click(screen.getByRole('button', { name: /load 3 more/i }))
    await waitFor(() => expect(ticketColumn()).toHaveLength(6))
    expect(ticketColumn()[0]).toBe('#4187')

    await userEvent.click(screen.getByRole('button', { name: /load 3 more/i }))
    await waitFor(() => expect(ticketColumn()).toHaveLength(7))
    expect(screen.queryByRole('button', { name: /load 3 more/i })).not.toBeInTheDocument()
  })

  it('shows a row written by something else, without being asked to re-list', async () => {
    const { records } = mount({ sort: { field: 'date', direction: 'desc' } })
    await flush()
    expect(ticketColumn()).toHaveLength(7)

    await act(async () => {
      records.insert('tickets', { ticket: '#4190', customer: 'Bram Ostrowski', date: '2026-09-12' })
    })

    await waitFor(() => expect(ticketColumn()).toEqual(expect.arrayContaining(['#4190'])))
    expect(ticketColumn()).toHaveLength(8)
  })

  it('opens a row from the keyboard as well as from a click', async () => {
    const onOpen = vi.fn()
    mount({ sort: { field: 'date', direction: 'desc' } }, onOpen)
    await flush()

    const rows = document.querySelectorAll<HTMLElement>('tbody [data-golem-row]')
    rows[0]!.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(rows[1])

    await userEvent.keyboard('{Enter}')
    expect(onOpen).toHaveBeenCalledTimes(1)
    expect(onOpen.mock.calls[0]![0]).toMatchObject({ ticket: '#4186' })
  })

  it('leaves rows inert when rowAction is none', async () => {
    const onOpen = vi.fn()
    mount({ rowAction: 'none' }, onOpen)
    await flush()

    const row = document.querySelector<HTMLElement>('tbody [data-golem-row]')!
    expect(row).not.toHaveAttribute('tabindex')
    await userEvent.click(row)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('draws cards with a sort control below the breakpoint', async () => {
    // jsdom lays nothing out and has no ResizeObserver, so the hook reads the viewport instead.
    const wide = window.innerWidth
    window.innerWidth = 390
    try {
      mount({ sort: { field: 'date', direction: 'desc' } })
      await act(async () => {
        window.dispatchEvent(new Event('resize'))
      })

      expect(document.querySelector('[data-golem-component="RecordList"]')).toHaveAttribute(
        'data-layout',
        'cards',
      )
      expect(screen.queryByRole('table')).not.toBeInTheDocument()

      // The card title is the field marked `primary`.
      expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('#4187')

      // No column headings to click, so the sort is a control of its own. It keeps the direction
      // it had, so the dearest ticket comes first.
      await userEvent.selectOptions(screen.getByLabelText('Sort'), 'quote')
      await waitFor(() =>
        expect(screen.getAllByRole('heading', { level: 3 })[0]).toHaveTextContent('#4181'),
      )
    } finally {
      window.innerWidth = wide
    }
  })

  it('shows the empty-state line when nothing matches', async () => {
    render(
      <RecordList
        config={config({ emptyState: 'No tickets on the board.' })}
        adapters={{ records: fakeRecords({ tickets: [] }) }}
      />,
    )
    await flush()

    expect(screen.getByText('No tickets on the board.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders an error card naming the field with an unknown type', () => {
    render(<RecordList {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('fields.2.type')
    expect(card).toHaveTextContent('Unknown field type "currency"')
    expect(card).toHaveTextContent('text, number, date, datetime, enum, boolean, money, user')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('rejects a filter on a key no field has, so a typo is never silently ignored', () => {
    render(
      <RecordList
        config={config({ filters: ['statuz'] })}
        adapters={{ records: fakeRecords({ tickets: examples.tickets }) }}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('statuz')
  })
})
