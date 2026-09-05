import { useEffect, useState, type RefObject } from 'react'

const windowWidth = () =>
  typeof window === 'undefined' ? Number.POSITIVE_INFINITY : window.innerWidth

/**
 * The breakpoint is a config value, not a stylesheet constant, so the layout cannot be picked by a
 * CSS media query — the frame measures itself instead. Measuring the element rather than the
 * viewport means an embedded Shell in a narrow column gets the mobile layout too.
 *
 * Falls back to the viewport where there is no ResizeObserver, or before the first measurement
 * (jsdom, server rendering, the first paint).
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [measured, setMeasured] = useState(0)
  const [viewport, setViewport] = useState(windowWidth)

  useEffect(() => {
    const element = ref.current
    if (element && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        setMeasured(entries[0]?.contentRect.width ?? 0)
      })
      observer.observe(element)
      return () => observer.disconnect()
    }
    return undefined
  }, [ref])

  useEffect(() => {
    const onResize = () => setViewport(windowWidth())
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return measured > 0 ? measured : viewport
}
