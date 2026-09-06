import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeClock, fakeRecords, type FakeRecords } from '../../adapters/fake'
import { VersionConflictError } from '../../adapters'
import { Editor } from './Editor'
import * as examples from './Editor.examples'
import type { EditorConfigInput } from './Editor.config'

/** Lets the adapter's promises land, so no state update escapes `act`. */
const flush = () => act(async () => {})

const config = (over: Partial<EditorConfigInput> = {}): EditorConfigInput => ({
  collection: 'dna',
  id: 'dna',
  autosaveMs: 0,
  ...over,
})

function mount(over: Partial<EditorConfigInput> = {}, draft?: string) {
  const records = fakeRecords({ dna: examples.dna.map((one) => ({ ...one })) })
  const view = render(
    <Editor
      config={config(over)}
      adapters={{ records, clock: fakeClock(examples.TODAY) }}
      draft={draft}
    />,
  )
  return { records, view }
}

const source = () => screen.getByLabelText('Document source') as HTMLTextAreaElement
const status = () => document.querySelector('[data-golem-status]')?.textContent ?? ''
const markedLines = () =>
  [...document.querySelectorAll('[data-golem-marked]')].map((line) => line.textContent)

/** The document with one line of the Rules section rewritten, as the agent would send it. */
const agentBody = examples.dnaBody.replace(
  '- Turnaround target is three days, measured from the ticket date.',
  '- Turnaround target is **two days**, measured from the ticket date.',
)

describe('Editor', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.editorExamples) {
      const { unmount } = render(<Editor {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('opens on the record’s body, saved and unmodified', async () => {
    mount()
    await flush()

    expect(source().value).toBe(examples.dnaBody)
    expect(status()).toBe('Saved')
  })

  it('debounces the autosave and sends the version it read', async () => {
    const { records } = mount({ autosaveMs: 40 })
    const update = vi.spyOn(records, 'update')
    await flush()

    await userEvent.type(source(), 'x')
    expect(status()).toBe('Unsaved changes')
    expect(update).not.toHaveBeenCalled()

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
    expect(update.mock.calls[0]![1]).toBe('dna')
    expect(update.mock.calls[0]![2]).toMatchObject({ version: 5 })
    expect(update.mock.calls[0]![3]).toEqual({ expectedVersion: 4, versionField: 'version' })
    await waitFor(() => expect(status()).toBe('Saved 13:20'))
  })

  it('saves now on Cmd+S rather than waiting out the debounce', async () => {
    const { records } = mount({ autosaveMs: 30_000 })
    const update = vi.spyOn(records, 'update')
    await flush()

    await userEvent.type(source(), 'x')
    await userEvent.keyboard('{Meta>}s{/Meta}')

    await waitFor(() => expect(update).toHaveBeenCalledTimes(1))
  })

  it('merges an agent’s version into the draft and marks the lines it wrote', async () => {
    const { records } = mount({ autosaveMs: 30_000, highlightMs: 30_000 })
    await flush()

    // The person is mid-sentence somewhere else in the document when the agent writes.
    await userEvent.type(source(), 'x')
    await act(async () => {
      await records.update('dna', 'dna', { body: agentBody, version: 5 })
    })

    await waitFor(() => expect(source().value).toContain('**two days**'))
    // Their line landed, and the local edit is still there beside it.
    expect(source().value.endsWith('x')).toBe(true)
    expect(markedLines()).toEqual([
      '- Turnaround target is **two days**, measured from the ticket date.',
    ])
  })

  it('lets the mark fade after highlightMs', async () => {
    vi.useFakeTimers()
    try {
      const records = fakeRecords({ dna: examples.dna.map((one) => ({ ...one })) })
      render(
        <Editor
          config={config({ autosaveMs: 30_000, highlightMs: 1000 })}
          adapters={{ records, clock: fakeClock(examples.TODAY) }}
        />,
      )
      await act(async () => {})
      await act(async () => {
        await records.update('dna', 'dna', { body: agentBody, version: 5 })
      })
      expect(markedLines()).toHaveLength(1)

      await act(async () => {
        vi.advanceTimersByTime(1100)
      })
      expect(markedLines()).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the choice when both writers changed the same lines, and keeps mine', async () => {
    const { records } = mount(
      { autosaveMs: 30_000 },
      examples.dnaBody.replace(
        '- Turnaround target is three days, measured from the ticket date.',
        '- Turnaround target is two days on a tune-up.',
      ),
    )
    await flush()

    await act(async () => {
      await records.update('dna', 'dna', { body: agentBody, version: 5 })
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Keep mine' })).toBeInTheDocument(),
    )
    expect(status()).toBe('The agent changed lines you were editing.')

    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    await waitFor(() => expect(source().value).toContain('two days on a tune-up'))
    expect(source().value).not.toContain('**two days**')
  })

  it('takes theirs when that is the choice, and marks the lines it took', async () => {
    const { records } = mount(
      { autosaveMs: 30_000, highlightMs: 30_000 },
      examples.dnaBody.replace(
        '- Turnaround target is three days, measured from the ticket date.',
        '- Turnaround target is two days on a tune-up.',
      ),
    )
    await flush()

    await act(async () => {
      await records.update('dna', 'dna', { body: agentBody, version: 5 })
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Take theirs' })).toBeInTheDocument(),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Take theirs' }))
    await waitFor(() => expect(source().value).toContain('**two days**'))
    expect(source().value).not.toContain('two days on a tune-up')
    expect(markedLines()).toEqual([
      '- Turnaround target is **two days**, measured from the ticket date.',
    ])
  })

  it('merges rather than erroring when the save is refused over the version', async () => {
    const store = fakeRecords({ dna: examples.dna.map((one) => ({ ...one })) })
    // A store that has already moved on, and only says so when the write arrives.
    const records: FakeRecords = {
      ...store,
      update: vi.fn(() =>
        Promise.reject(
          new VersionConflictError('This dna record is at version 5, not 4.', {
            id: 'dna',
            body: agentBody,
            version: 5,
          }),
        ),
      ) as unknown as FakeRecords['update'],
    }

    render(
      <Editor
        config={config({ autosaveMs: 0 })}
        adapters={{ records, clock: fakeClock(examples.TODAY) }}
      />,
    )
    await flush()

    await userEvent.type(source(), 'x')

    await waitFor(() => expect(source().value).toContain('**two days**'))
    expect(source().value.endsWith('x')).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('blocks input and offers no actions when readOnly is on', async () => {
    mount({ readOnly: true })
    await flush()

    expect(source()).toHaveAttribute('readonly')
    await userEvent.type(source(), 'x')
    expect(source().value).toBe(examples.dnaBody)
    expect(screen.queryByRole('button', { name: 'Bold' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('wraps the selection on Cmd+B, and indents a list line on Tab', async () => {
    mount({ autosaveMs: 30_000 })
    await flush()

    const element = source()
    const at = examples.dnaBody.indexOf('Northgate Cycles')
    act(() => {
      element.focus()
      element.setSelectionRange(at, at + 'Northgate'.length)
    })
    await userEvent.keyboard('{Meta>}b{/Meta}')
    expect(source().value).toContain('# **Northgate** Cycles')

    const rule = source().value.indexOf('- A ticket is')
    act(() => {
      source().setSelectionRange(rule + 2, rule + 2)
    })
    await userEvent.tab()
    expect(source().value).toContain('  - A ticket is')
  })

  it('leaves Tab alone outside a list, so the keyboard can get out of the box', async () => {
    mount({ autosaveMs: 30_000 })
    await flush()

    const at = examples.dnaBody.indexOf('A neighbourhood')
    act(() => {
      source().focus()
      source().setSelectionRange(at + 2, at + 2)
    })
    await userEvent.tab()
    expect(source().value).toBe(examples.dnaBody)
    expect(source()).not.toHaveFocus()
  })

  it('undoes and redoes the person’s own edits', async () => {
    mount({ autosaveMs: 30_000 })
    await flush()

    await userEvent.type(source(), 'zzz')
    expect(source().value.endsWith('zzz')).toBe(true)

    await userEvent.keyboard('{Meta>}z{/Meta}')
    expect(source().value).toBe(examples.dnaBody)

    await userEvent.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}')
    expect(source().value.endsWith('zzz')).toBe(true)
  })

  it('renders the document through the kit’s markdown when the preview is on', async () => {
    mount()
    await flush()

    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Northgate Cycles' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Rules' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Document source')).not.toBeInTheDocument()
  })

  it('offers the headings as an outline', async () => {
    mount()
    await flush()

    await userEvent.click(screen.getByRole('button', { name: 'Outline' }))
    const outline = screen.getByRole('navigation', { name: 'Outline' })
    expect(outline).toHaveTextContent('Records')
    expect(outline).toHaveTextContent('Screens')
    expect(outline).toHaveTextContent('Rules')
  })

  it('renders an error card naming the field the config got wrong', () => {
    render(<Editor {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('autosaveMs')
    expect(screen.queryByLabelText('Document source')).not.toBeInTheDocument()
  })

  it('says so when the record is not there', async () => {
    render(
      <Editor
        config={config({ id: 'nowhere' })}
        adapters={{
          records: fakeRecords({ dna: examples.dna.map((one) => ({ ...one })) }),
          clock: fakeClock(examples.TODAY),
        }}
      />,
    )
    await flush()

    expect(screen.getByRole('alert')).toHaveTextContent('no dna record with the id nowhere')
  })

  it('shows the adapter’s own message when the save rejects for its own reasons', async () => {
    const store = fakeRecords({ dna: examples.dna.map((one) => ({ ...one })) })
    const records: FakeRecords = {
      ...store,
      update: (() =>
        Promise.reject(
          new Error('The DNA is locked while the agent compiles it.'),
        )) as FakeRecords['update'],
    }

    render(<Editor config={config()} adapters={{ records, clock: fakeClock(examples.TODAY) }} />)
    await flush()
    await userEvent.type(source(), 'x')

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'The DNA is locked while the agent compiles it.',
      ),
    )
  })
})

describe('fakeRecords version enforcement', () => {
  it('refuses an update whose expected version is stale, and hands back the current record', async () => {
    const records = fakeRecords({ dna: [{ id: 'dna', body: 'one', version: 1 }] })
    await records.update('dna', 'dna', { body: 'two', version: 2 }, { expectedVersion: 1 })

    await expect(
      records.update('dna', 'dna', { body: 'three', version: 2 }, { expectedVersion: 1 }),
    ).rejects.toMatchObject({
      name: 'VersionConflictError',
      current: { id: 'dna', body: 'two', version: 2 },
    })
  })
})
