import { RegisterForm, useRegisterSubmit } from '@/features/auth-by-email'
import { OAuthBlock } from '@/features/oauth-button'
import styles from './RegisterPage.module.css'

export function RegisterPage() {
  const onSubmit = useRegisterSubmit()
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            new handle
            <span className={styles.caret} aria-hidden />
          </h1>
          <p className={styles.subtitle}>// create an account</p>
        </header>

        <RegisterForm onSubmit={onSubmit} />

        <OAuthBlock />

        <p className={styles.footer}>
          already registered? <a href="/login">sign in</a>
        </p>
      </div>
    </div>
  )
}