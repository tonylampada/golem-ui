import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeClock, fakeRecords, type FakeRecords } from '../../adapters/fake'
import { VersionConflictError } from '../../adapters'
import { Editor, type EditorFocus } from './Editor'
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

describe('Editor focus', () => {
  const handbook = () => fakeRecords({ handbook: examples.handbooks.map((one) => ({ ...one })) })
  const focusConfig = (over: Partial<EditorConfigInput> = {}) =>
    config({ collection: 'handbook', id: 'bench', autosaveMs: 30_000, ...over })
  const focused = () =>
    [...document.querySelectorAll('[data-golem-focus]')].map((line) => line.textContent)
  const brakes = examples.handbookLine('Hydraulic brakes')
  const pads = examples.handbookLine('Pads contaminated')
  // An empty row is drawn as a no-break space, so it keeps its height.
  const lines = examples.handbookBody.split('\n').map((line) => line || '\u00a0')

  function host(records: FakeRecords, over: Partial<EditorConfigInput> = {}) {
    const adapters = { records, clock: fakeClock(examples.TODAY) }
    const view = render(<Editor config={focusConfig(over)} adapters={adapters} />)
    return {
      ...view,
      ask: (focus: EditorFocus | undefined, more: Partial<EditorConfigInput> = {}) =>
        view.rerender(
          <Editor config={focusConfig({ ...over, ...more })} adapters={adapters} focus={focus} />,
        ),
    }
  }

  it('marks the requested lines once the record has loaded', async () => {
    const records = handbook()
    render(
      <Editor
        config={focusConfig()}
        adapters={{ records, clock: fakeClock(examples.TODAY) }}
        focus={{ line: brakes, endLine: pads }}
      />,
    )
    expect(focused()).toEqual([])
    await flush()

    expect(focused()).toEqual(lines.slice(brakes - 1, pads))
    expect(focused()[0]).toBe('## 6. Hydraulic brakes')
  })

  it('leaves the draft, the caret and keyboard focus alone', async () => {
    const { ask } = host(handbook())
    await flush()
    await userEvent.type(source(), 'x')
    source().setSelectionRange(3, 5)
    const before = document.activeElement

    ask({ line: brakes, endLine: pads })
    await flush()

    expect(focused()).toHaveLength(pads - brakes + 1)
    expect(source().value).toBe(`${examples.handbookBody}x`)
    expect(status()).toBe('Unsaved changes')
    expect(document.activeElement).toBe(before)
    expect([source().selectionStart, source().selectionEnd]).toEqual([3, 5])
  })

  it('clamps a range past either end of the document, and ignores a line that is not a number', async () => {
    const { ask } = host(handbook())
    await flush()

    ask({ line: -4, endLine: 2 })
    await flush()
    expect(focused()).toEqual(lines.slice(0, 2))

    ask({ line: 9999 })
    await flush()
    expect(focused()).toEqual([lines.at(-1)])

    ask({ line: 12, endLine: 3 })
    await flush()
    expect(focused()).toEqual([lines[11]])

    ask({ line: Number.NaN })
    await flush()
    expect(focused()).toEqual([lines[11]])
  })

  it('takes the mark down on a click or an edit, and shows it again only for a new key', async () => {
    const { ask } = host(handbook())
    await flush()
    ask({ line: brakes, key: 'a' })
    await flush()
    expect(focused()).toHaveLength(1)

    await userEvent.click(source())
    expect(focused()).toEqual([])

    ask({ line: brakes, key: 'a' })
    await flush()
    expect(focused()).toEqual([])

    ask({ line: brakes, key: 'b' })
    await flush()
    expect(focused()).toHaveLength(1)

    await userEvent.keyboard('y')
    expect(focused()).toEqual([])
  })

  it('takes the mark down when an agent version merges in', async () => {
    const records = handbook()
    const { ask } = host(records)
    await flush()
    ask({ line: brakes })
    await flush()

    await act(async () => {
      await records.update('handbook', 'bench', {
        body: `A line the agent added at the top.\n${examples.handbookBody}`,
        version: 2,
      })
    })
    await waitFor(() => expect(source().value).toContain('the agent added'))
    expect(focused()).toEqual([])
  })

  it('switches a toggle editor from the preview to the source', async () => {
    const { ask } = host(handbook(), { preview: 'toggle' })
    await flush()
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(document.querySelector('[data-golem-pane="source"]')).toBeNull()

    ask({ line: brakes })
    await flush()

    expect(document.querySelector('[data-golem-pane="preview"]')).toBeNull()
    expect(focused()).toEqual(['## 6. Hydraulic brakes'])
  })

  it('drops a request made for one record when the host has moved to another', async () => {
    const records = handbook()
    const { ask } = host(records)
    await flush()
    ask({ line: brakes, key: 'a' })
    await flush()
    await userEvent.type(source(), 'x')

    // The same request stays in props while the host opens the other record.
    ask({ line: brakes, key: 'a' }, { id: 'counter' })
    await flush()

    expect(source().value).toBe(examples.dnaBody)
    expect(status()).toBe('Saved')
    expect(focused()).toEqual([])
    // Nothing was written on the way out: the draft left behind is parked, not saved.
    await expect(records.get('handbook', 'bench')).resolves.toMatchObject({ version: 1 })

    // A request sent with the move belongs to the record it moved to.
    ask({ line: 1, key: 'b' }, { id: 'bench' })
    await flush()
    expect(source().value).toBe(`${examples.handbookBody}x`)
    expect(focused()).toEqual(['# Northgate Cycles bench handbook'])
  })
})

describe('Editor moving between records', () => {
  const handbook = (extra: examples.DnaDocument[] = []) =>
    fakeRecords({ handbook: [...examples.handbooks, ...extra].map((one) => ({ ...one })) })
  const focused = () => document.querySelectorAll('[data-golem-focus]').length
  const mine = examples.handbookBody.replace('Bleed with', 'Mine: bleed with')
  const theirs = examples.handbookBody.replace('Bleed with', 'Theirs: bleed with')

  function host(first: FakeRecords) {
    const clock = fakeClock(examples.TODAY)
    const at = (over: Partial<EditorConfigInput>, records = first, focus?: EditorFocus) => (
      <Editor
        config={config({ collection: 'handbook', id: 'bench', autosaveMs: 30_000, ...over })}
        adapters={{ records, clock }}
        focus={focus}
      />
    )
    const view = render(at({}))
    return (...args: Parameters<typeof at>) => view.rerender(at(...args))
  }

  it('keeps a draft whose save was refused while away, and asks about it on return', async () => {
    const store = handbook()
    let release = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    // A store whose save is still in flight when the person leaves, and whose other writer this
    // editor does not hear about until the save is refused.
    const records: FakeRecords = {
      ...store,
      subscribe: () => () => {},
      update: (async (...args: Parameters<FakeRecords['update']>) => {
        await gate
        return store.update(...args)
      }) as FakeRecords['update'],
    }
    const move = host(records)
    await flush()

    fireEvent.change(source(), { target: { value: mine } })
    await store.update('handbook', 'bench', { body: theirs, version: 2 })
    source().focus()
    await userEvent.keyboard('{Meta>}s{/Meta}')
    expect(status()).toBe('Saving…')

    move({ id: 'counter' })
    await flush()
    expect(source().value).toBe(examples.dnaBody)

    await act(async () => release())
    await flush()
    expect(source().value).toBe(examples.dnaBody)

    move({ id: 'bench' })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Keep mine' })).toBeInTheDocument(),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(source().value).toBe(mine)
    expect(status()).toBe('Unsaved changes')
  })

  it('keeps an open conflict across a move', async () => {
    const records = handbook()
    const move = host(records)
    await flush()
    fireEvent.change(source(), { target: { value: mine } })
    await act(async () => {
      await records.update('handbook', 'bench', { body: theirs, version: 2 })
    })
    expect(screen.getByRole('button', { name: 'Keep mine' })).toBeInTheDocument()

    move({ id: 'counter' })
    await flush()
    move({ id: 'bench' })
    await flush()

    await userEvent.click(screen.getByRole('button', { name: 'Keep mine' }))
    expect(source().value).toBe(mine)
  })

  it('never writes a draft to another field or another store', async () => {
    const records = handbook()
    const other = handbook()
    const writes = [vi.spyOn(records, 'update'), vi.spyOn(other, 'update')]
    const move = host(records)
    await flush()
    await userEvent.type(source(), 'x')

    move({ bodyField: 'title' })
    await flush()
    expect(source().value).toBe('Bench handbook')

    move({}, other)
    await flush()
    expect(source().value).toBe(examples.handbookBody)

    for (const write of writes) expect(write).not.toHaveBeenCalled()
    await expect(records.get('handbook', 'bench')).resolves.toMatchObject({
      body: examples.handbookBody,
      title: 'Bench handbook',
    })

    move({}, records)
    await flush()
    expect(source().value).toBe(`${examples.handbookBody}x`)
    expect(status()).toBe('Unsaved changes')
  })

  it('does not carry a focus mark to another record with the same text', async () => {
    const move = host(
      handbook([{ id: 'twin', title: 'Twin', body: examples.handbookBody, version: 1 }]),
    )
    await flush()
    move({}, undefined, { line: 6, key: 'a' })
    await flush()
    expect(focused()).toBe(1)

    move({ id: 'twin' }, undefined, { line: 6, key: 'a' })
    await flush()
    expect(source().value).toBe(examples.handbookBody)
    expect(focused()).toBe(0)
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
