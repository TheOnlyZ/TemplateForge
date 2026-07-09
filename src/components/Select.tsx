import { useId } from 'react'
import type { SelectHTMLAttributes } from 'react'
import styles from './Select.module.css'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
}

export function Select({ label, id: externalId, children, className = '', ...rest }: SelectProps) {
  const autoId = useId()
  const selectId = externalId ?? autoId

  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.label} htmlFor={selectId}>{label}</label>}
      <div className={styles.wrapper}>
        <select className={styles.select} id={selectId} {...rest}>
          {children}
        </select>
        <span className={styles.chevron}>&#9662;</span>
      </div>
    </div>
  )
}
