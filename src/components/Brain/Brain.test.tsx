import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { fakeBrain } from '../../adapters/fake'
import { parseLocation } from '../../adapters'
import { Chat } from '../Chat/Chat'
import { Brain } from './Brain'
import * as examples from './Brain.examples'

const flush = () => act(async () => {})

describe('Brain', () => {
  it('renders every documented example without crashing', async () => {
    for (const example of examples.brainExamples) {
      const { unmount } = render(<Brain {...example.props} />)
      await flush()
      unmount()
    }
  })

  it('parses a source location', () => {
    expect(parseLocation('a/b.md#L3-L5')).toEqual({ path: 'a/b.md', start: 3, end: 5 })
    expect(parseLocation('a/b.md#L3')).toEqual({ path: 'a/b.md', start: 3, end: 3 })
    expect(parseLocation('a/b.md')).toEqual({ path: 'a/b.md', start: undefined, end: undefined })
  })

  it('opens the root index first, and the cited file with L3-L5 highlighted when told to', async () => {
    const brain = fakeBrain({
      'index.md': '# Root\n\n* [notes.md](notes.md)',
      'notes.md': 'line one\n\nline three\nline four\nline five\n\nline seven',
    })
    const { rerender } = render(<Brain config={{}} adapters={{ brain }} />)
    await screen.findByText('Root')

    rerender(<Brain config={{ openLocation: 'notes.md#L3-L5' }} adapters={{ brain }} />)
    const mark = await waitFor(() => document.querySelector('[data-golem-brain-highlight]')!)
    expect(mark).toHaveAttribute('data-golem-brain-highlight', 'L3-L5')
    expect(mark).toHaveTextContent('line three line four line five')
    expect(mark).not.toHaveTextContent('line one')
    expect(mark).not.toHaveTextContent('line seven')
    expect(screen.getByText('line one')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'notes.md' })).toHaveAttribute('aria-current', 'page')
  })

  it('synthesizes an index from front matter when a directory has none', async () => {
    const brain = fakeBrain({
      'a.md': '---\ntype: concept\ndescription: the first\n---\n# A',
      'sub/b.md': '---\ntype: concept\n---\n# B',
    })
    expect(await brain.index()).toBe('# Index\n\n* [sub](sub/)\n* [a.md](a.md) - the first\n')
    expect(await brain.list('sub')).toEqual([{ path: 'sub/b.md', kind: 'file' }])
    expect(await brain.search('# b')).toEqual([{ path: 'sub/b.md', line: 4, excerpt: '# B' }])
  })

  it('renders an error card naming every invalid field instead of the reader', () => {
    render(<Brain {...examples.invalidConfig.props} />)
    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('openLocation')
    expect(card).toHaveTextContent('theme')
  })
})

describe('Chat sources', () => {
  it('draws a chip per source and hands the location to openSource on click', async () => {
    const openSource = vi.fn()
    const chat = {
      history: async () => examples.sourcedConversation,
      send: async () => {},
      subscribe: () => () => {},
      openSource,
    }
    render(<Chat config={{}} adapters={{ chat }} />)
    const chip = await screen.findByRole('button', { name: 'turnaround.md L6-8' })
    await userEvent.click(chip)
    expect(openSource).toHaveBeenCalledWith('workshop/turnaround.md#L6-L8')
  })
})

describe('Brain links', () => {
  it('opens a relative link inside the bundle in the reader', async () => {
    const brain = fakeBrain({
      'index.md': '# Root\n\n* [Forks](workshop/forks.md)',
      'workshop/forks.md': '# Forks\n\nSee [suppliers](../suppliers.md).',
      'suppliers.md': '# Suppliers',
    })
    render(<Brain config={{}} adapters={{ brain }} />)
    await userEvent.click(await screen.findByRole('link', { name: 'Forks' }))
    await userEvent.click(await screen.findByRole('link', { name: 'suppliers' }))
    expect(await screen.findByRole('heading', { name: 'Suppliers' })).toBeInTheDocument()
  })
})
