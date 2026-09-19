import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Shell } from './Shell'
import * as examples from './Shell.examples'

const originalWidth = window.innerWidth

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true })
  act(() => {
    window.dispatchEvent(new Event('resize'))
  })
}

beforeEach(() => localStorage.clear())
/** The chat sheet, found by hand: a hidden dialog has no accessible name for `getByRole` to match. */
const sheetEl = () => document.querySelector('[role=dialog]')!
afterEach(() => setViewportWidth(originalWidth))

describe('Shell', () => {
  it('renders every documented example without crashing', () => {
    for (const example of examples.shellExamples) {
      setViewportWidth(example.viewportWidth)
      const { unmount } = render(<Shell {...example.props} />)
      unmount()
    }
  })

  it('shows the title, the icon buttons and the signed-in user in the top bar', async () => {
    setViewportWidth(examples.desktop.viewportWidth)
    render(<Shell {...examples.desktop.props} />)

    expect(screen.getByText('Northgate Cycles')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Robin Vale')).toBeInTheDocument())
  })

  it('hands the top bar’s right-hand end to the account slot when it is given one', async () => {
    setViewportWidth(examples.desktop.viewportWidth)
    render(<Shell {...examples.desktop.props} account={<button type="button">Robin V.</button>} />)

    expect(screen.getByRole('button', { name: 'Robin V.' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Robin Vale')).not.toBeInTheDocument())
  })

  it('draws the bottom menu, marks the current route, and navigates or calls onSelect per item', async () => {
    setViewportWidth(1200)
    const onSelect = vi.fn()
    const go = vi.spyOn(examples.desktop.props.adapters.navigation, 'go')
    const menu = [...examples.desktop.props.config.menu!, { id: 'admin', label: 'Admin' }]
    render(<Shell {...examples.desktop.props} config={{ title: 'x', menu }} onSelect={onSelect} />)

    const nav = screen.getByRole('navigation', { name: 'Menu' })
    // The bar is the frame's last row, so the sheet (a sibling after it) can cover it.
    expect(nav.previousElementSibling).not.toBeNull()
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Today')
    await userEvent.click(screen.getByRole('button', { name: 'Jobs' }))
    expect(go).toHaveBeenCalledWith('/jobs')
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('Jobs')
    await userEvent.click(screen.getByRole('button', { name: 'Admin' }))
    expect(onSelect).toHaveBeenCalledWith('admin')
    go.mockRestore()
  })

  it('toggles the desktop chat column and remembers the choice across a reload', async () => {
    setViewportWidth(1200)
    const { unmount } = render(<Shell {...examples.desktop.props} />)
    const toggle = screen.getByRole('button', { name: 'Chat' })
    const aside = screen.getByRole('separator', { name: 'Resize chat' }).parentElement!
    expect(aside).not.toHaveAttribute('hidden')

    await userEvent.click(toggle)
    expect(aside).toHaveAttribute('hidden')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    unmount()

    render(<Shell {...examples.desktop.props} />)
    expect(screen.getByRole('separator', { name: 'Resize chat', hidden: true }).parentElement).toHaveAttribute('hidden')
  })

  it('opens the settings dropdown with the theme toggle and closes it on Esc', async () => {
    setViewportWidth(1200)
    render(
      <Shell
        {...examples.desktop.props}
        settings={<Shell.Setting icon="🔧" label="Builder" on={false} onClick={() => {}} />}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('menuitem', { name: /mode/ })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Builder' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders only the canvas and no chat toggle when chat is null', () => {
    setViewportWidth(1200)
    const { rerender } = render(<Shell {...examples.phone.props} chat={null} />)
    expect(screen.queryByRole('button', { name: 'Chat' })).not.toBeInTheDocument()
    expect(screen.getByText(/Daily report/)).toBeInTheDocument()
    setViewportWidth(390)
    rerender(<Shell {...examples.phone.props} chat={null} />)
    expect(document.querySelector('[role=dialog]')).not.toBeInTheDocument()
    expect(screen.getByText(/Daily report/)).toBeInTheDocument()
  })

  it('drags the chat edge to a new width, keeps it, and resets on double-click', () => {
    setViewportWidth(1200)
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
      <Shell {...examples.desktop.props} config={{ title: 'x', initialTab: 'chat' } as never} />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('initialTab')
  })
})

describe('Shell on a phone', () => {
  it('starts with the sheet closed; the toggle opens it over the canvas, Esc closes it', async () => {
    setViewportWidth(390)
    render(<Shell {...examples.phone.props} />)
    const sheet = sheetEl()
    expect(sheet).toHaveAttribute('hidden')
    expect(screen.getByText(/Daily report/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Chat' }))
    expect(sheet).not.toHaveAttribute('hidden')
    expect(screen.getByText(/What do you want to build/)).toBeInTheDocument()
    // The canvas stays mounted under the sheet, so its scroll survives the round trip.
    expect(screen.getByText(/Daily report/)).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    expect(sheet).toHaveAttribute('hidden')
  })

  it('closes the sheet when the route changes, and opens it when chatOpen turns on', () => {
    setViewportWidth(390)
    const config = { ...examples.phone.props.config, chatOpen: false }
    const { rerender } = render(<Shell {...examples.phone.props} config={config} />)
    const sheet = sheetEl()

    rerender(<Shell {...examples.phone.props} config={{ ...config, chatOpen: true }} />)
    expect(sheet).not.toHaveAttribute('hidden')

    act(() => examples.phone.props.adapters.navigation.go('/brain'))
    expect(sheet).toHaveAttribute('hidden')
  })
})
