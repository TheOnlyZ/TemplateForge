import type { ReactNode } from 'react'
import styles from './Badge.module.css'

interface BadgeProps {
  variant?: 'default' | 'accent' | 'warning'
  dot?: boolean
  children?: ReactNode
  className?: string
}

export function Badge({ variant = 'default', dot: showDot, children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className}`}>
      {showDot && <span className={styles.dot} />}
      {children}
    </span>
  )
}
