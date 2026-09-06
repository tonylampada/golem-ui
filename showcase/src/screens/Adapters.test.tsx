import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { adapterDocs, fakeNavigation } from 'golem-ui'
import { AdapterDetail, AdaptersIndex } from './Adapters'

/**
 * `#/adapters` is the route the landing page links to, so it has to list every documented adapter
 * and every slug has to resolve. The list itself is held true against `src/adapters/*.ts` by
 * `src/adapters/adapters.docs.test.ts`; this is the half that says the pages render it.
 */
describe('the adapter pages', () => {
  it('lists every adapter', () => {
    render(<AdaptersIndex />)
    for (const docs of adapterDocs) {
      expect(screen.getByText(docs.name)).toBeInTheDocument()
    }
  })

  it('opens each adapter by its own slug, and says so when there is no such adapter', () => {
    for (const docs of adapterDocs) {
      const { unmount } = render(<AdapterDetail slug={docs.slug} navigation={fakeNavigation()} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(docs.name)
      unmount()
    }
    render(<AdapterDetail slug="nothing-by-that-name" navigation={fakeNavigation()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No adapter called')
  })
})
