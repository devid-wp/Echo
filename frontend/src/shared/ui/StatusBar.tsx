import styles from './StatusBar.module.css'

export function StatusBar({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.bar} role="status">
      <div className={styles.dots} aria-hidden>
        <span /><span /><span />
      </div>
      <span>{children ?? 'working…'}</span>
    </div>
  )
}