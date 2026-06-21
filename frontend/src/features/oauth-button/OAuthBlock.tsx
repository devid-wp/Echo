import { env } from '@/shared/config/env'
import styles from './OAuthBlock.module.css'

type Provider = 'google' | 'github'

interface OAuthBlockProps {
  /** Where to send the user after a successful OAuth round-trip. */
  redirectTo?: string
}

/**
 * OAuthBlock — sign in with Google / GitHub.
 *
 *  In dev (no client IDs set) the buttons are still rendered but warn
 *  the user that the flow is a stub. Wire real redirects by setting
 *  VITE_OAUTH_GOOGLE_CLIENT_ID and VITE_OAUTH_GITHUB_CLIENT_ID.
 *
 *  The actual exchange happens server-side; the client only needs to
 *  redirect to the provider's authorize URL with a state token, then
 *  receive the session via the same /api/auth/* endpoints.
 */
export function OAuthBlock({ redirectTo = '/feed' }: OAuthBlockProps) {
  const stubbed = !env.oauthGoogleClientId && !env.oauthGithubClientId

  const begin = (provider: Provider) => {
    if (provider === 'google' && !env.oauthGoogleClientId) return
    if (provider === 'github' && !env.oauthGithubClientId) return
    const state = btoa(JSON.stringify({ provider, redirectTo, ts: Date.now() }))
    const url =
      provider === 'google'
        ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.oauthGoogleClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/callback')}&response_type=code&scope=openid%20email%20profile&state=${state}`
        : `https://github.com/login/oauth/authorize?client_id=${env.oauthGithubClientId}&redirect_uri=${encodeURIComponent(window.location.origin + '/oauth/callback')}&scope=read:user%20user:email&state=${state}`
    window.location.assign(url)
  }

  return (
    <div className={styles.oauth}>
      <div className={styles.divider}><span>or continue with</span></div>

      <button
        type="button"
        className={styles.provider}
        onClick={() => begin('google')}
        disabled={!env.oauthGoogleClientId}
        aria-label="Continue with Google"
      >
        <span className={styles.glyph} aria-hidden>[G]</span>
        <span>Google</span>
        {!env.oauthGoogleClientId && <span className={styles.stub}>stub</span>}
      </button>

      <button
        type="button"
        className={styles.provider}
        onClick={() => begin('github')}
        disabled={!env.oauthGithubClientId}
        aria-label="Continue with GitHub"
      >
        <span className={styles.glyph} aria-hidden>[H]</span>
        <span>GitHub</span>
        {!env.oauthGithubClientId && <span className={styles.stub}>stub</span>}
      </button>

      {stubbed && (
        <p className={styles.stub}>
          // set VITE_OAUTH_*_CLIENT_ID in .env to enable real OAuth
        </p>
      )}
    </div>
  )
}