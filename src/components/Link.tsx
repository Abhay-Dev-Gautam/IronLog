import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigate } from '../app/router'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  /** Replace the current history entry instead of pushing (used by tabs). */
  replace?: boolean
}

/** In-app link: a real `<a href>` for semantics, routed without a page load. */
export function Link({ to, replace, onClick, children, ...rest }: LinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }
    event.preventDefault()
    navigate(to, { replace })
  }
  return (
    <a href={`#${to}`} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
