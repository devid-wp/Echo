import { forwardRef, useId } from 'react'
import styles from './Field.module.css'

interface FieldShellProps {
  prompt?: string
  invalid?: boolean
  children: React.ReactNode
}

export function FieldShell({ prompt = '>', invalid, children }: FieldShellProps) {
  return (
    <div className={styles.shell} data-invalid={invalid ? 'true' : 'false'}>
      <span className={styles.prompt} aria-hidden>{prompt}</span>
      {children}
    </div>
  )
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  prompt?: string
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, required, prompt, inputProps },
  ref,
) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.req} aria-hidden>*</span>}
      </label>
      <FieldShell prompt={prompt} invalid={Boolean(error)}>
        <input
          ref={ref}
          id={id}
          className={styles.input}
          aria-invalid={Boolean(error)}
          aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...inputProps}
        />
      </FieldShell>
      {hint && !error && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errId} className={styles.error} role="alert">{error}</p>}
    </div>
  )
})

interface TextAreaProps {
  label: string
  hint?: string
  error?: string
  required?: boolean
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hint, error, required, textareaProps },
  ref,
) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errId = error ? `${id}-err` : undefined
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && <span className={styles.req} aria-hidden>*</span>}
      </label>
      <div className={styles.shell} data-invalid={error ? 'true' : 'false'}>
        <textarea
          ref={ref}
          id={id}
          className={styles.textarea}
          aria-invalid={Boolean(error)}
          aria-describedby={[hintId, errId].filter(Boolean).join(' ') || undefined}
          required={required}
          {...textareaProps}
        />
      </div>
      {hint && !error && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errId} className={styles.error} role="alert">{error}</p>}
    </div>
  )
})