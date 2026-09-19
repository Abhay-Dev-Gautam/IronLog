/** IronLog mark: a dumbbell stood on end, forming an "I". Decorative. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="116" fill="#141416" />
      <g fill="#d4ff3f">
        <rect x="176" y="96" width="160" height="40" rx="14" />
        <rect x="136" y="144" width="240" height="56" rx="18" />
        <rect x="226" y="192" width="60" height="128" />
        <rect x="136" y="312" width="240" height="56" rx="18" />
        <rect x="176" y="376" width="160" height="40" rx="14" />
      </g>
    </svg>
  )
}
