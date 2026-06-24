import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Field } from '@/shared/ui'
import { ApiError } from '@/shared/api/client'
import { login, register as registerUser } from '@/shared/api/endpoints'
import { useAuthStore } from '@/store/auth'
import { ROUTES } from '@/shared/config/env'
import {
  loginPayloadSchema,
  registerPayloadSchema,
} from '@/shared/model/schemas'
import type { LoginPayload, RegisterPayload } from '@/types/domain'
import styles from './AuthForm.module.css'

interface LoginFormProps {
  onSubmit: (values: LoginPayload) => Promise<void>
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } =
    useForm<LoginPayload>({
      resolver: zodResolver(loginPayloadSchema),
      defaultValues: { email: '', password: '' },
    })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      navigate(ROUTES.feed, { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'sign in failed'
      setError('root', { message: msg })
    }
  })

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label="email or handle"
        required
        prompt="$"
        inputProps={{
          type: 'text',
          autoComplete: 'username',
          autoFocus: true,
          placeholder: 'alice@echo.dev  or  alice',
          ...register('email'),
        }}
        error={errors.email?.message}
      />
      <Field
        label="password"
        required
        prompt="#"
        inputProps={{
          type: 'password',
          autoComplete: 'current-password',
          placeholder: '••••••••',
          ...register('password'),
        }}
        error={errors.password?.message}
      />

      {errors.root && <p className={styles.server} role="alert">{errors.root.message}</p>}

      <Button type="submit" variant="primary" block loading={isSubmitting} prefix=">">
        sign in
      </Button>

      <p className={styles.hint}>
        no account? <Link to={ROUTES.register}>register</Link>
      </p>
    </form>
  )
}

interface RegisterFormProps {
  onSubmit: (values: RegisterPayload) => Promise<void>
}

export function RegisterForm({ onSubmit }: RegisterFormProps) {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterPayload>({
    resolver: zodResolver(registerPayloadSchema),
    defaultValues: { handle: '', displayName: '', email: '', password: '' },
  })

  const submit = handleSubmit(async (values) => {
    try {
      await onSubmit(values)
      navigate(ROUTES.feed, { replace: true })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'registration failed'
      setError('root', { message: msg })
    }
  })

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <Field
        label="handle"
        required
        prompt="@"
        hint="3–24 chars, lowercase, digits, underscore"
        inputProps={{
          type: 'text',
          autoComplete: 'username',
          autoFocus: true,
          placeholder: 'ada',
          ...register('handle'),
        }}
        error={errors.handle?.message}
      />
      <Field
        label="display name"
        required
        prompt=">"
        inputProps={{
          type: 'text',
          autoComplete: 'name',
          placeholder: 'Ada Lovelace',
          ...register('displayName'),
        }}
        error={errors.displayName?.message}
      />
      <Field
        label="email"
        required
        prompt="$"
        inputProps={{
          type: 'email',
          autoComplete: 'email',
          placeholder: 'ada@echo.dev',
          ...register('email'),
        }}
        error={errors.email?.message}
      />
      <Field
        label="password"
        required
        prompt="#"
        hint="min 8 characters"
        inputProps={{
          type: 'password',
          autoComplete: 'new-password',
          placeholder: '••••••••',
          ...register('password'),
        }}
        error={errors.password?.message}
      />

      {errors.root && <p className={styles.server} role="alert">{errors.root.message}</p>}

      <Button type="submit" variant="primary" block loading={isSubmitting} prefix=">">
        create account
      </Button>

      <p className={styles.hint}>
        have an account? <Link to={ROUTES.login}>sign in</Link>
      </p>
    </form>
  )
}

/* ----- shared submit helpers wired to the auth store ----- */

export function useLoginSubmit() {
  const setSession = useAuthStore((s) => s.setSession)
  return async (values: LoginPayload) => {
    const session = await login(values)
    setSession(session)
  }
}

export function useRegisterSubmit() {
  const setSession = useAuthStore((s) => s.setSession)
  return async (values: RegisterPayload) => {
    const session = await registerUser(values)
    setSession(session)
  }
}