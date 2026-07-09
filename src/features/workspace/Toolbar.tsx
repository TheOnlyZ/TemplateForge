import { type ChangeEvent, type RefObject } from 'react'
import { Button } from '../../components/Button.tsx'
import type { UnitSystem } from '../../domain/units/index.ts'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  unitSystem: UnitSystem
  onUnitSystemChange: (unit: UnitSystem) => void
  onSaveProject: () => void
  onOpenProject: () => void
  projectFileInputRef: RefObject<HTMLInputElement | null>
  onProjectFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function Toolbar({
  unitSystem,
  onUnitSystemChange,
  onSaveProject,
  onOpenProject,
  projectFileInputRef,
  onProjectFileChange,
}: ToolbarProps) {
  return (
    <header className={styles.toolbar}>
      <input
        ref={projectFileInputRef}
        type="file"
        accept="application/json,.json,.templateforge.json"
        hidden
        onChange={onProjectFileChange}
      />
      <div className={styles.brand}>
        <h1 className={styles.title}>TemplateForge</h1>
        <p className={styles.subtitle}>
          Physical template design with true-scale geometry and printable layout rules.
        </p>
      </div>
      <div className={styles.actions}>
        <div className={styles.group}>
          <Button
            variant={unitSystem === 'metric' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onUnitSystemChange('metric')}
          >
            mm
          </Button>
          <Button
            variant={unitSystem === 'imperial' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onUnitSystemChange('imperial')}
          >
            in
          </Button>
        </div>
        <div className={styles.group}>
          <Button size="sm" onClick={onSaveProject}>
            Save
          </Button>
          <Button size="sm" onClick={onOpenProject}>
            Open
          </Button>
        </div>
      </div>
    </header>
  )
}
