import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id: externalId, className = '', ...rest }: InputProps) {
  const autoId = useId()
  const inputId = externalId ?? autoId

  return (
    <div className={`${styles.field} ${className}`}>
      {label && <label className={styles.label} htmlFor={inputId}>{label}</label>}
      <input className={styles.input} id={inputId} {...rest} />
    </div>
  )
}
