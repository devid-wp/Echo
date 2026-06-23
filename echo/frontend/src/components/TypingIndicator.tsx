import { useEffect, useState } from 'react';
import styles from './TypingIndicator.module.css';

/**
 * Simple typing indicator. Shows a pulsing ellipsis when `typing` is true.
 */
export function TypingIndicator({ typing }: { typing: boolean }) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    if (!typing) return;
    const interval = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, [typing]);

  if (!typing) return null;
  return (
    <div className={styles.indicator} aria-live="polite">
      typing{'.'.repeat(dots)}
    </div>
  );
}
