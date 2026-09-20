import type { ReactNode } from 'react'

export type IconName =
  | 'dumbbell'
  | 'history'
  | 'progress'
  | 'settings'
  | 'chevron-left'
  | 'chevron-right'
  | 'check'
  | 'arrow-right'
  | 'moon'
  | 'alert'
  | 'plus'
  | 'minus'
  | 'note'
  | 'timer'
  | 'pause'
  | 'play'
  | 'reset'
  | 'trophy'
  | 'chevron-down'
  | 'download'
  | 'upload'

const PATHS: Record<IconName, ReactNode> = {
  dumbbell: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />,
  history: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  progress: <path d="M4 19.5h16M5 15l4.5-4.5 3.5 3.5L19 8M14.5 8H19v4.5" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h11M19 17h1" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  'chevron-left': <path d="M14.5 18l-6-6 6-6" />,
  'chevron-right': <path d="M9.5 18l6-6-6-6" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  moon: <path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5M12 16.2v.3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  note: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 10v3.5l2 1.5M10 3h4M12 3v3.5" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" />,
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5z" />,
  reset: <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9M4.5 4.5V9H9" />,
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4" />
  ),
  'chevron-down': <path d="M6 9.5l6 6 6-6" />,
  download: <path d="M12 4v10.5M7.5 10.5L12 15l4.5-4.5M5 19h14" />,
  upload: <path d="M12 15V4.5M7.5 9L12 4.5 16.5 9M5 19h14" />,
}

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}

/** Decorative icon. Always pair with visible text or an `aria-label` on the control. */
export function Icon({ name, size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  )
}
