import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm, RegisterForm } from './AuthForms'
import { useAuthStore } from '@/store/auth'
import { renderWithProviders } from '@/test/render'
import { startServer, stopServer, server } from '@/test/msw-server'
import { authHandlers } from './auth-handlers'

beforeAll(() => startServer(...authHandlers))
afterAll(() => stopServer())
afterEach(() => {
  server.resetHandlers()
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
  window.localStorage.clear()
})

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null, status: 'idle' })
})

describe('LoginForm', () => {
  it('renders email + password fields and a submit button', () => {
    const onSubmit = vi.fn()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)
    expect(screen.getByLabelText(/email or handle/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows zod errors when submitting with invalid values', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/enter email or username/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows zod error for short password', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email or handle/i), 'alice@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('calls onSubmit with values on valid submission', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email or handle/i), 'alice@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'alice@echo.dev',
        password: 'password123',
      })
    })
  })

  it('shows server error from onSubmit (ApiError) in errors.root alert', async () => {
    const { ApiError } = await import('@/shared/api/client')
    const apiError = new ApiError('invalid_credentials', 'wrong password', 401)
    const onSubmit = vi.fn().mockRejectedValue(apiError)
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email or handle/i), 'alice@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('wrong password')
  })

  it('submit button shows loading state while submitting', async () => {
    let resolveSubmit!: () => void
    const onSubmit = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve }),
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email or handle/i), 'alice@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled()
    })

    resolveSubmit()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
    })
  })

  it('shows generic error for non-ApiError exceptions', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderWithProviders(<LoginForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/email or handle/i), 'alice@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('sign in failed')
  })

  it('links to /register page', () => {
    renderWithProviders(<LoginForm onSubmit={async () => {}} />)
    const link = screen.getByRole('link', { name: /register/i })
    expect(link).toHaveAttribute('href', '/register')
  })
})

describe('RegisterForm', () => {
  it('renders handle, displayName, email, password fields', () => {
    const onSubmit = vi.fn()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)
    expect(screen.getByLabelText(/handle/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('validates handle (lowercase, 3-24, [a-z0-9_])', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/handle/i), 'AB')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/min 3 chars|lowercase letters, digits and underscore only/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('validates email format', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/handle/i), 'ada')
    await user.type(screen.getByLabelText(/display name/i), 'Ada')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    })
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits valid registration', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/handle/i), 'ada')
    await user.type(screen.getByLabelText(/display name/i), 'Ada')
    await user.type(screen.getByLabelText(/email/i), 'ada@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        handle: 'ada',
        displayName: 'Ada',
        email: 'ada@echo.dev',
        password: 'password',
      })
    })
  })

  it('shows server handle_taken error in alert', async () => {
    const { ApiError } = await import('@/shared/api/client')
    const onSubmit = vi.fn().mockRejectedValue(new ApiError('handle_taken', 'in use', 409))
    const user = userEvent.setup()
    renderWithProviders(<RegisterForm onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/handle/i), 'ada')
    await user.type(screen.getByLabelText(/display name/i), 'Ada')
    await user.type(screen.getByLabelText(/email/i), 'ada@echo.dev')
    await user.type(screen.getByLabelText(/password/i), 'password')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('in use')
  })

  it('links back to /login', () => {
    renderWithProviders(<RegisterForm onSubmit={async () => {}} />)
    const link = screen.getByRole('link', { name: /sign in/i })
    expect(link).toHaveAttribute('href', '/login')
  })
})
