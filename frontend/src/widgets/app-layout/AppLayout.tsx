import { Outlet } from 'react-router-dom'
import { Navbar } from '@/widgets/navbar/Navbar'
import { TabBar } from '@/widgets/tabbar/TabBar'
import styles from './AppLayout.module.css'

/**
 * AppLayout — the chrome around every page.
 *
 *  - Navbar (top) shows on viewports >= 720px
 *  - TabBar (bottom) shows on smaller viewports
 *  - Footer is decorative and always visible
 */
export function AppLayout() {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>echo · build {import.meta.env.MODE}</footer>
      <TabBar />
    </div>
  )
}