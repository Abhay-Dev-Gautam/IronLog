import { useEffect, useState, type RefObject } from 'react'

/** Content width of an element, kept current as it resizes (rotation, split view). */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // ResizeObserver reports the initial size too, so no synchronous measurement is needed.
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  return width
}
