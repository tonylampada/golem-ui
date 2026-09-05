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

    expect(screen.getByText("Isaac's workspace")).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Ana Ribeiro')).toBeInTheDocument())
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
