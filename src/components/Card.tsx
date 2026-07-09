import type { ReactNode } from 'react'
import styles from './Card.module.css'

interface CardProps {
  variant?: 'flat' | 'elevated'
  header?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}

export function Card({ variant = 'flat', header, footer, children, className = '' }: CardProps) {
  return (
    <div className={`${styles.card} ${variant === 'elevated' ? styles.elevated : ''} ${className}`}>
      {header && <div className={styles.header}>{header}</div>}
      {children && <div className={styles.body}>{children}</div>}
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  )
}
