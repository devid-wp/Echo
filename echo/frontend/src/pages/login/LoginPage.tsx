import { LoginForm, useLoginSubmit } from '@/features/auth-by-email'
import { OAuthBlock } from '@/features/oauth-button'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const onSubmit = useLoginSubmit()
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <header className={styles.head}>
          <h1 className={styles.title}>
            echo login
            <span className={styles.caret} aria-hidden />
          </h1>
          <p className={styles.subtitle}>// authenticate to continue</p>
        </header>

        <LoginForm onSubmit={onSubmit} />

        <OAuthBlock />

        <div className={styles.demo}>
          <b>demo:</b> handle <b>ada</b>, password <b>password</b>
        </div>

        <p className={styles.footer}>
          don't have a handle? <a href="/register">register</a>
        </p>
      </div>
    </div>
  )
}