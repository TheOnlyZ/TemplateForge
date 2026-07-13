import styles from './Stepper.module.css'

interface Step {
  id: string
  label: string
}

interface StepperProps {
  steps: Step[]
  activeIndex: number
  className?: string
  onStepSelect?: (stepId: string, index: number) => void
}

export function Stepper({ steps, activeIndex, className = '', onStepSelect }: StepperProps) {
  return (
    <ol className={`${styles.stepper} ${className}`}>
      {steps.map((step, i) => (
        <li
          key={step.id}
          className={`${styles.step} ${i === activeIndex ? styles.active : ''} ${i < activeIndex ? styles.completed : ''}`}
          aria-current={i === activeIndex ? 'step' : undefined}
        >
          <button
            type="button"
            className={styles.stepButton}
            onClick={() => onStepSelect?.(step.id, i)}
          >
            <span className={styles.num}>{i + 1}</span>
            {step.label}
          </button>
        </li>
      ))}
    </ol>
  )
}
