import type { ChangeEvent, RefObject } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu.tsx'
import { ToggleGroupItem, ToggleGroupRoot } from '../../components/ui/toggle-group.tsx'
import { useTheme } from '../../lib/use-theme.ts'
import { useAppStore } from '../../store/app-store.ts'

interface TopBarProps {
  onSaveProject: () => void
  onOpenProject: () => void
  projectFileInputRef: RefObject<HTMLInputElement | null>
  onProjectFileChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function TopBar({
  onSaveProject,
  onOpenProject,
  projectFileInputRef,
  onProjectFileChange,
}: TopBarProps) {
  const draft = useAppStore((s) => s.draft)
  const setDraftName = useAppStore((s) => s.setDraftName)
  const unitSystem = useAppStore((s) => s.unitSystem)
  const setUnitSystem = useAppStore((s) => s.setUnitSystem)
  const resetDraft = useAppStore((s) => s.resetDraft)
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-surface px-4">
      <input
        ref={projectFileInputRef}
        type="file"
        accept="application/json,.json,.templateforge.json"
        hidden
        onChange={onProjectFileChange}
      />

      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-text-h">TemplateForge</span>
        <span className="h-4 w-px bg-border" />
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setDraftName(e.target.value)}
          className="h-7 rounded border border-transparent bg-transparent px-2 text-sm text-text-h outline-none transition-colors hover:border-border focus:border-accent-border focus:bg-surface-elevated"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 rounded-md px-3 text-sm text-text-h transition-colors hover:bg-surface-hover">
              File
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => resetDraft()}>
                New Template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onSaveProject}>
                Save Project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onOpenProject}>
                Open Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <span className="h-5 w-px bg-border" />

        <ToggleGroupRoot value={unitSystem} onValueChange={(v) => setUnitSystem(v as 'metric' | 'imperial')}>
          <ToggleGroupItem value="metric" selectedValue={unitSystem} onSelect={() => setUnitSystem('metric')}>
            mm
          </ToggleGroupItem>
          <ToggleGroupItem value="imperial" selectedValue={unitSystem} onSelect={() => setUnitSystem('imperial')}>
            in
          </ToggleGroupItem>
        </ToggleGroupRoot>

        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8 rounded-md text-sm text-text-muted transition-colors hover:bg-surface-hover hover:text-text-h"
          aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  )
}
