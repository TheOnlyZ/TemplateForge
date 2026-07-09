import styles from './Stepper.module.css'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  activeIndex: number
  className?: string
}

export function Stepper({ steps, activeIndex, className = '' }: StepperProps) {
  return (
    <ol className={`${styles.stepper} ${className}`}>
      {steps.map((step, i) => (
        <li
          key={step.id}
          className={`${styles.step} ${i === activeIndex ? styles.active : ''} ${i < activeIndex ? styles.completed : ''}`}
          aria-current={i === activeIndex ? 'step' : undefined}
        >
          <span className={styles.num}>{i + 1}</span>
          {step.label}
        </li>
      ))}
    </ol>
  )
}
