import type { BoxStyle } from '../../domain/shapes/box/index.ts'
import type { TemplateItem } from '../../domain/templates/index.ts'

export type AssemblyMode = 'finished' | 'exploded' | 'sequence'
export type AssemblyFaceId = 'base' | 'front' | 'back' | 'left' | 'right' | 'top'
export type AssemblyCueKind = 'fold-up' | 'fold-in' | 'fold-over' | 'glue-here' | 'press-secure'

export type AssemblySequenceStepId =
  | 'fold-front-wall'
  | 'fold-back-wall'
  | 'fold-left-wall'
  | 'fold-right-wall'
  | 'apply-glue-tabs'
  | 'press-secure-tabs'
  | 'fold-right-panel'
  | 'fold-back-panel'
  | 'fold-left-panel'
  | 'glue-side-seam'
  | 'fold-top-closure'
  | 'fold-base-closure'

export interface BoxAssemblyFace {
  id: AssemblyFaceId
  label: string
  targetIds: string[]
}

export interface BoxAssemblyStep {
  id: AssemblySequenceStepId
  title: string
  instruction: string
  focusFaceId: AssemblyFaceId | null
  cueKind: AssemblyCueKind
  cueLabel: string
  targetIds: string[]
  foldIds: string[]
  glueTabIds: string[]
}

export interface BoxAssemblyModel {
  modeOptions: AssemblyMode[]
  faces: BoxAssemblyFace[]
  steps: BoxAssemblyStep[]
  targetIdToFaceId: Record<string, AssemblyFaceId>
  targetIdToFaceLabel: Record<string, string>
  interactiveTargetIds: Set<string>
  glueTabIds: Set<string>
  defaultMode: AssemblyMode
}

function buildTargetLookup(faces: BoxAssemblyFace[]) {
  const targetIdToFaceId: Record<string, AssemblyFaceId> = {}
  const targetIdToFaceLabel: Record<string, string> = {}

  for (const face of faces) {
    for (const targetId of face.targetIds) {
      targetIdToFaceId[targetId] = face.id
      targetIdToFaceLabel[targetId] = face.label
    }
  }

  return {
    targetIdToFaceId,
    targetIdToFaceLabel,
  }
}

function getTargetPanelIds(template: TemplateItem, names: string[]) {
  return template.panels.filter((panel) => names.includes(panel.name)).map((panel) => panel.id)
}

function getTargetTabIds(template: TemplateItem, prefixes: string[]) {
  return template.tabs
    .filter((tab) => prefixes.some((prefix) => tab.label?.startsWith(prefix)))
    .map((tab) => tab.id)
}

function getTargetFoldIds(template: TemplateItem, fragments: string[]) {
  return template.foldLines
    .filter((line) => fragments.some((fragment) => line.id.includes(fragment)))
    .map((line) => line.id)
}

function buildOpenTrayModel(template: TemplateItem): BoxAssemblyModel {
  const glueTabIds = template.tabs.map((tab) => tab.id)
  const faces: BoxAssemblyFace[] = [
    { id: 'front', label: 'Front', targetIds: getTargetPanelIds(template, ['Front Wall']) },
    { id: 'back', label: 'Back', targetIds: getTargetPanelIds(template, ['Back Wall']) },
    { id: 'left', label: 'Left', targetIds: getTargetPanelIds(template, ['Left Wall']) },
    { id: 'right', label: 'Right', targetIds: getTargetPanelIds(template, ['Right Wall']) },
    { id: 'base', label: 'Base', targetIds: getTargetPanelIds(template, ['Base']) },
  ]
  const steps: BoxAssemblyStep[] = [
    {
      id: 'fold-front-wall',
      title: 'Step 1',
      instruction: 'Fold Front Wall upward 90°',
      focusFaceId: 'front',
      cueKind: 'fold-up',
      cueLabel: 'Fold Up',
      targetIds: getTargetPanelIds(template, ['Front Wall']),
      foldIds: getTargetFoldIds(template, ['front-wall']),
      glueTabIds: [],
    },
    {
      id: 'fold-back-wall',
      title: 'Step 2',
      instruction: 'Fold Back Wall upward 90°',
      focusFaceId: 'back',
      cueKind: 'fold-up',
      cueLabel: 'Fold Up',
      targetIds: getTargetPanelIds(template, ['Back Wall']),
      foldIds: getTargetFoldIds(template, ['back-wall']),
      glueTabIds: [],
    },
    {
      id: 'fold-left-wall',
      title: 'Step 3',
      instruction: 'Fold Left Wall inward',
      focusFaceId: 'left',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Left Wall']),
      foldIds: getTargetFoldIds(template, ['left-wall']),
      glueTabIds: [],
    },
    {
      id: 'fold-right-wall',
      title: 'Step 4',
      instruction: 'Fold Right Wall inward',
      focusFaceId: 'right',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Right Wall']),
      foldIds: getTargetFoldIds(template, ['right-wall']),
      glueTabIds: [],
    },
    {
      id: 'apply-glue-tabs',
      title: 'Step 5',
      instruction: 'Apply adhesive to glue tabs',
      focusFaceId: null,
      cueKind: 'glue-here',
      cueLabel: 'Glue Here',
      targetIds: glueTabIds,
      foldIds: getTargetFoldIds(template, ['tab-']),
      glueTabIds,
    },
    {
      id: 'press-secure-tabs',
      title: 'Step 6',
      instruction: 'Press tabs until secure',
      focusFaceId: 'front',
      cueKind: 'press-secure',
      cueLabel: 'Press Secure',
      targetIds: [
        ...getTargetPanelIds(template, ['Front Wall', 'Back Wall']),
        ...glueTabIds,
      ],
      foldIds: [],
      glueTabIds,
    },
  ]
  const { targetIdToFaceId, targetIdToFaceLabel } = buildTargetLookup(faces)

  return {
    modeOptions: ['finished', 'exploded', 'sequence'],
    faces,
    steps,
    targetIdToFaceId,
    targetIdToFaceLabel,
    interactiveTargetIds: new Set(Object.keys(targetIdToFaceId)),
    glueTabIds: new Set(glueTabIds),
    defaultMode: 'finished',
  }
}

function buildCartonModel(template: TemplateItem): BoxAssemblyModel {
  const topTabIds = getTargetTabIds(template, ['Top '])
  const baseTabIds = getTargetTabIds(template, ['Bottom '])
  const glueTabIds = template.tabs.filter((tab) => tab.label === 'Glue Seam').map((tab) => tab.id)
  const faces: BoxAssemblyFace[] = [
    { id: 'front', label: 'Front', targetIds: getTargetPanelIds(template, ['Front Panel']) },
    { id: 'back', label: 'Back', targetIds: getTargetPanelIds(template, ['Back Panel']) },
    { id: 'left', label: 'Left', targetIds: getTargetPanelIds(template, ['Left Panel']) },
    { id: 'right', label: 'Right', targetIds: getTargetPanelIds(template, ['Right Panel']) },
    { id: 'base', label: 'Base', targetIds: baseTabIds },
    { id: 'top', label: 'Top', targetIds: topTabIds },
  ]
  const steps: BoxAssemblyStep[] = [
    {
      id: 'fold-right-panel',
      title: 'Step 1',
      instruction: 'Fold Right panel inward 90°',
      focusFaceId: 'right',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Right Panel']),
      foldIds: getTargetFoldIds(template, ['front-right']),
      glueTabIds: [],
    },
    {
      id: 'fold-back-panel',
      title: 'Step 2',
      instruction: 'Fold Back panel inward 90°',
      focusFaceId: 'back',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Back Panel']),
      foldIds: getTargetFoldIds(template, ['right-back']),
      glueTabIds: [],
    },
    {
      id: 'fold-left-panel',
      title: 'Step 3',
      instruction: 'Fold Left panel inward 90°',
      focusFaceId: 'left',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Left Panel']),
      foldIds: getTargetFoldIds(template, ['back-left']),
      glueTabIds: [],
    },
    {
      id: 'glue-side-seam',
      title: 'Step 4',
      instruction: 'Fold glue seam inward and secure the shell',
      focusFaceId: null,
      cueKind: 'glue-here',
      cueLabel: 'Glue Here',
      targetIds: glueTabIds,
      foldIds: getTargetFoldIds(template, ['glue-seam']),
      glueTabIds,
    },
    {
      id: 'fold-top-closure',
      title: 'Step 5',
      instruction: 'Fold the top closure over',
      focusFaceId: 'top',
      cueKind: 'fold-over',
      cueLabel: 'Fold Over',
      targetIds: topTabIds,
      foldIds: template.foldLines
        .filter((line) => topTabIds.some((tabId) => line.id === `${template.id}:fold:tab-${tabId}`))
        .map((line) => line.id),
      glueTabIds: [],
    },
    {
      id: 'fold-base-closure',
      title: 'Step 6',
      instruction: 'Fold the base closure over',
      focusFaceId: 'base',
      cueKind: 'fold-over',
      cueLabel: 'Fold Over',
      targetIds: baseTabIds,
      foldIds: template.foldLines
        .filter((line) => baseTabIds.some((tabId) => line.id === `${template.id}:fold:tab-${tabId}`))
        .map((line) => line.id),
      glueTabIds: [],
    },
  ]
  const { targetIdToFaceId, targetIdToFaceLabel } = buildTargetLookup(faces)

  return {
    modeOptions: ['finished', 'exploded', 'sequence'],
    faces,
    steps,
    targetIdToFaceId,
    targetIdToFaceLabel,
    interactiveTargetIds: new Set(Object.keys(targetIdToFaceId)),
    glueTabIds: new Set(glueTabIds),
    defaultMode: 'finished',
  }
}

export function buildBoxAssemblyModel(template: TemplateItem, style: BoxStyle): BoxAssemblyModel {
  if (style === 'open-tray') {
    return buildOpenTrayModel(template)
  }

  return buildCartonModel(template)
}
