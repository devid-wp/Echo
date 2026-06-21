import { forwardRef } from 'react'
import clsx from 'clsx'
import styles from './Button.module.css'

export type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  block?: boolean
  loading?: boolean
  prefix?: string
  suffix?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    block = false,
    loading = false,
    disabled,
    prefix,
    suffix,
    children,
    className,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={disabled || loading}
      className={clsx(
        styles.btn,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        block && styles.block,
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className={styles.spinner} aria-hidden />
      ) : prefix ? (
        <span className={styles.glyph}>{prefix}</span>
      ) : null}
      <span>{children}</span>
      {suffix ? <span className={styles.glyph}>{suffix}</span> : null}
    </button>
  )
})