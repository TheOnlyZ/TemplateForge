import { Badge } from '../../components/Badge.tsx'
import { Card } from '../../components/Card.tsx'
import type { ValidationMessage } from '../../domain/validation/index.ts'
import styles from './ValidationPanel.module.css'

interface ValidationPanelProps {
  messages: ValidationMessage[]
}

export function ValidationPanel({ messages }: ValidationPanelProps) {
  return (
    <Card header={<span>Validation</span>}>
      {messages.length === 0 ? (
        <p className={styles.ok}>No issues — ready to export.</p>
      ) : (
        <ul className={styles.list}>
          {messages.map((message) => (
            <li key={message.code + message.message} className={styles.item}>
              <Badge
                variant={message.severity === 'warning' ? 'warning' : 'accent'}
                dot
              >
                {message.severity}
              </Badge>
              <span className={styles.text}>{message.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
