import type { ButtonHTMLAttributes, ComponentProps } from 'react'
import styles from './Button.module.css'
import { Link } from './Link'

type Variant = 'primary' | 'secondary' | 'ghost'

interface StyleProps {
  variant?: Variant
  size?: 'regular' | 'large'
  block?: boolean
}

function buttonClass({ variant = 'primary', size = 'regular', block = false }: StyleProps, extra?: string): string {
  return [styles.button, styles[variant], size === 'large' && styles.large, block && styles.block, extra]
    .filter(Boolean)
    .join(' ')
}

export function Button({
  variant,
  size,
  block,
  className,
  type = 'button',
  ...rest
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={buttonClass({ variant, size, block }, className)} {...rest} />
}

/** A link styled as a button — for actions that navigate. */
export function ButtonLink({ variant, size, block, className, ...rest }: StyleProps & ComponentProps<typeof Link>) {
  return <Link className={buttonClass({ variant, size, block }, className)} {...rest} />
}
