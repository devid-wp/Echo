import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Field, FieldShell, TextArea } from './Field'

describe('Field', () => {
  it('renders label and input', () => {
    render(<Field label="email" />)
    expect(screen.getByLabelText('email')).toBeInTheDocument()
  })

  it('uses generated id linking label to input', () => {
    render(<Field label="email" />)
    const input = screen.getByLabelText('email')
    expect(input.id).toBeTruthy()
  })

  it('marks input aria-invalid when error is set', () => {
    render(<Field label="email" error="required" />)
    const input = screen.getByLabelText('email')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('does not mark aria-invalid when no error', () => {
    render(<Field label="email" />)
    expect(screen.getByLabelText('email')).toHaveAttribute('aria-invalid', 'false')
  })

  it('renders hint and wires aria-describedby', () => {
    render(<Field label="email" hint="use your work address" />)
    const input = screen.getByLabelText('email')
    const describedBy = input.getAttribute('aria-describedby')!
    expect(describedBy).toBeTruthy()
    const hintEl = document.getElementById(describedBy)
    expect(hintEl).toHaveTextContent('use your work address')
  })

  it('hides hint when error is set (error takes precedence)', () => {
    render(<Field label="email" hint="hint text" error="boom" />)
    expect(screen.queryByText('hint text')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('boom')
  })

  it('error message has role="alert"', () => {
    render(<Field label="email" error="required" />)
    expect(screen.getByRole('alert')).toHaveTextContent('required')
  })

  it('passes inputProps through to the input', async () => {
    const user = userEvent.setup()
    render(<Field label="email" inputProps={{ placeholder: 'you@x.com', type: 'email' }} />)
    const input = screen.getByPlaceholderText('you@x.com')
    expect(input).toHaveAttribute('type', 'email')
    await user.type(input, 'a@b')
    expect(input).toHaveValue('a@b')
  })

  it('forwards ref to the input element', () => {
    let captured: HTMLInputElement | null = null
    render(<Field label="email" ref={(el) => { captured = el }} />)
    expect(captured).toBeInstanceOf(HTMLInputElement)
  })

  it('required indicator in label', () => {
    render(<Field label="email" required />)
    expect(screen.getByLabelText(/email/)).toBeRequired()
  })

  it('renders custom prompt via FieldShell', () => {
    render(<FieldShell prompt="$">child</FieldShell>)
    expect(screen.getByText('$')).toBeInTheDocument()
    expect(screen.getByText('child')).toBeInTheDocument()
  })

  it('FieldShell data-invalid reflects invalid prop', () => {
    const { rerender, container } = render(<FieldShell invalid>child</FieldShell>)
    const shell = container.querySelector('[data-invalid]')!
    expect(shell).toHaveAttribute('data-invalid', 'true')
    rerender(<FieldShell invalid={false}>child</FieldShell>)
    expect(container.querySelector('[data-invalid]')).toHaveAttribute('data-invalid', 'false')
  })
})

describe('TextArea', () => {
  it('renders a textarea with label', () => {
    render(<TextArea label="message" />)
    expect(screen.getByLabelText('message')).toBeInstanceOf(HTMLTextAreaElement)
  })

  it('renders error and sets aria-invalid', () => {
    render(<TextArea label="message" error="too short" />)
    const ta = screen.getByLabelText('message')
    expect(ta).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('too short')
  })

  it('hint wires aria-describedby', () => {
    render(<TextArea label="message" hint="markdown supported" />)
    const ta = screen.getByLabelText('message')
    const id = ta.getAttribute('aria-describedby')!
    expect(document.getElementById(id)).toHaveTextContent('markdown supported')
  })

  it('forwards ref to the textarea', () => {
    let captured: HTMLTextAreaElement | null = null
    render(<TextArea label="message" ref={(el) => { captured = el }} />)
    expect(captured).toBeInstanceOf(HTMLTextAreaElement)
  })
})