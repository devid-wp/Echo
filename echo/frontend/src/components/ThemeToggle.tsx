import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

/**
 * ThemeToggle – switches between light and dark theme.
 * Persists choice in localStorage and updates the <html> data-theme attribute.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<string>(() => {
    const stored = localStorage.getItem('theme');
    return stored ?? 'light';
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggle = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button className={styles.toggle} onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? '🌞' : '🌙'}
    </button>
  );
}
