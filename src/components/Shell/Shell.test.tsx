import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Shell } from './Shell'
import * as examples from './Shell.examples'

const originalWidth = window.innerWidth

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

afterEach(() => setViewportWidth(originalWidth))

describe('Shell', () => {
  it('renders every documented example without crashing', () => {
    for (const example of examples.shellExamples) {
      setViewportWidth(example.viewportWidth)
      const { unmount } = render(<Shell {...example.props} />)
      unmount()
    }
  })

  it('shows the title and the signed-in user in the top bar', async () => {
    setViewportWidth(examples.desktop.viewportWidth)
    render(<Shell {...examples.desktop.props} />)

    expect(screen.getByText('Northgate Cycles')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Robin Vale')).toBeInTheDocument())
  })

  it('hands the top bar’s right-hand end to the account slot when it is given one', async () => {
    setViewportWidth(examples.desktop.viewportWidth)
    render(<Shell {...examples.desktop.props} account={<button type="button">Robin V.</button>} />)

    expect(screen.getByRole('button', { name: 'Robin V.' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Robin Vale')).not.toBeInTheDocument())
  })

  it('lays the panes side by side above the breakpoint and as tabs below it', async () => {
    setViewportWidth(1200)
    const { rerender } = render(<Shell {...examples.mobile.props} />)
    expect(screen.queryAllByRole('tab')).toHaveLength(0)

    setViewportWidth(420)
    rerender(<Shell {...examples.mobile.props} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['chat', 'canvas'])
    expect(screen.getByText(/What do you want to build/)).toBeInTheDocument()

    await userEvent.click(tabs[1]!)
    expect(screen.getByText(/Daily report/)).toBeInTheDocument()
    expect(screen.queryByText(/What do you want to build/)).not.toBeInTheDocument()
  })

  it('drags the chat edge to a new width, keeps it, and resets on double-click', () => {
    setViewportWidth(1200)
    localStorage.removeItem('golem-shell-chat-width')
    const { unmount } = render(<Shell {...examples.desktop.props} />)
    const handle = screen.getByRole('separator', { name: 'Resize chat' })
    const aside = handle.parentElement!
    expect(aside.style.width).toBe('320px')

    // jsdom has no layout: the frame's rect is all zeros, so clientX is the width itself.
    handle.setPointerCapture = () => {}
    act(() => {
      handle.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 320 }))
      handle.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: 500 }))
      handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 500 }))
    })
    expect(aside.style.width).toBe('500px')
    expect(localStorage.getItem('golem-shell-chat-width')).toBe('500')

    unmount()
    render(<Shell {...examples.desktop.props} />)
    const again = screen.getByRole('separator', { name: 'Resize chat' })
    expect(again.parentElement!.style.width).toBe('500px')

    act(() => {
      again.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    })
    expect(again.parentElement!.style.width).toBe('320px')
    expect(localStorage.getItem('golem-shell-chat-width')).toBeNull()
  })

  it('renders an error card naming every invalid field instead of the frame', () => {
    render(<Shell {...examples.invalidConfig.props} />)

    const card = screen.getByRole('alert')
    expect(card).toHaveTextContent('title')
    expect(card).toHaveTextContent('breakpoint')
    expect(screen.queryByText(/Daily report/)).not.toBeInTheDocument()
  })

  it('rejects unknown config fields, so a misspelt option is never silently ignored', () => {
    render(
      <Shell {...examples.desktop.props} config={{ title: 'x', chatside: 'right' } as never} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('chatside')
  })
})

describe('Shell on a phone', () => {
  it('brings the canvas tab forward when the route changes', () => {
    setViewportWidth(420)
    render(<Shell {...examples.mobile.props} />)
    expect(screen.getByRole('tab', { name: 'chat' })).toHaveAttribute('aria-selected', 'true')
    act(() => examples.mobile.props.adapters.navigation.go('/brain'))
    expect(screen.getByRole('tab', { name: 'canvas' })).toHaveAttribute('aria-selected', 'true')
  })
})
