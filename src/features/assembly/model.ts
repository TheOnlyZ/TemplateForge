import type { BoxStyle } from '../../domain/shapes/box/index.ts'
import type { TemplateItem } from '../../domain/templates/index.ts'

export type AssemblyMode = 'finished' | 'exploded' | 'sequence'
export type AssemblyFaceId =
  | 'base'
  | 'front'
  | 'back'
  | 'left'
  | 'right'
  | 'top'
  | 'body'
  | 'bottom'
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
  | 'curve-body-wrap'
  | 'glue-cylinder-seam'
  | 'fold-top-alignment'
  | 'seat-top-cap'
  | 'fold-bottom-alignment'
  | 'seat-bottom-cap'

export interface AssemblyFace {
  id: AssemblyFaceId
  label: string
  targetIds: string[]
}

export interface AssemblyStep {
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

export interface AssemblyModel {
  modeOptions: AssemblyMode[]
  faces: AssemblyFace[]
  steps: AssemblyStep[]
  targetIdToFaceId: Record<string, AssemblyFaceId>
  targetIdToFaceLabel: Record<string, string>
  interactiveTargetIds: Set<string>
  glueTabIds: Set<string>
  defaultMode: AssemblyMode
}

export type BoxAssemblyFace = AssemblyFace
export type BoxAssemblyStep = AssemblyStep
export type BoxAssemblyModel = AssemblyModel

function buildTargetLookup(faces: AssemblyFace[]) {
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

function buildOpenTrayModel(template: TemplateItem): AssemblyModel {
  const glueTabIds = template.tabs.map((tab) => tab.id)
  const faces: AssemblyFace[] = [
    { id: 'front', label: 'Front', targetIds: getTargetPanelIds(template, ['Front Panel']) },
    { id: 'back', label: 'Back', targetIds: getTargetPanelIds(template, ['Back Panel']) },
    { id: 'left', label: 'Left', targetIds: getTargetPanelIds(template, ['Left Panel']) },
    { id: 'right', label: 'Right', targetIds: getTargetPanelIds(template, ['Right Panel']) },
    { id: 'base', label: 'Base', targetIds: getTargetPanelIds(template, ['Bottom Panel']) },
  ]
  const steps: AssemblyStep[] = [
    {
      id: 'fold-front-wall',
      title: 'Step 1',
      instruction: 'Fold Front Wall upward 90°',
      focusFaceId: 'front',
      cueKind: 'fold-up',
      cueLabel: 'Fold Up',
      targetIds: getTargetPanelIds(template, ['Front Panel']),
      foldIds: getTargetFoldIds(template, ['bottom-front']),
      glueTabIds: [],
    },
    {
      id: 'fold-back-wall',
      title: 'Step 2',
      instruction: 'Fold Back Wall upward 90°',
      focusFaceId: 'back',
      cueKind: 'fold-up',
      cueLabel: 'Fold Up',
      targetIds: getTargetPanelIds(template, ['Back Panel']),
      foldIds: getTargetFoldIds(template, ['bottom-back']),
      glueTabIds: [],
    },
    {
      id: 'fold-left-wall',
      title: 'Step 3',
      instruction: 'Fold Left Wall inward',
      focusFaceId: 'left',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Left Panel']),
      foldIds: getTargetFoldIds(template, ['bottom-left']),
      glueTabIds: [],
    },
    {
      id: 'fold-right-wall',
      title: 'Step 4',
      instruction: 'Fold Right Wall inward',
      focusFaceId: 'right',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: getTargetPanelIds(template, ['Right Panel']),
      foldIds: getTargetFoldIds(template, ['bottom-right']),
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
        ...getTargetPanelIds(template, ['Front Panel', 'Back Panel']),
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

function buildCartonModel(template: TemplateItem): AssemblyModel {
  const topTabIds = getTargetTabIds(template, ['Top '])
  const baseTabIds = getTargetTabIds(template, ['Bottom '])
  const glueTabIds = template.tabs.filter((tab) => tab.label === 'Glue Seam').map((tab) => tab.id)
  const faces: AssemblyFace[] = [
    { id: 'front', label: 'Front', targetIds: getTargetPanelIds(template, ['Front Panel']) },
    { id: 'back', label: 'Back', targetIds: getTargetPanelIds(template, ['Back Panel']) },
    { id: 'left', label: 'Left', targetIds: getTargetPanelIds(template, ['Left Panel']) },
    { id: 'right', label: 'Right', targetIds: getTargetPanelIds(template, ['Right Panel']) },
    { id: 'base', label: 'Base', targetIds: baseTabIds },
    { id: 'top', label: 'Top', targetIds: topTabIds },
  ]
  const steps: AssemblyStep[] = [
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

export function buildCylinderAssemblyModel(template: TemplateItem): AssemblyModel {
  const glueTabIds = template.tabs.filter((tab) => tab.label === 'Glue Seam').map((tab) => tab.id)
  const topAlignmentTabIds = getTargetTabIds(template, ['Top Alignment Tab'])
  const bottomAlignmentTabIds = getTargetTabIds(template, ['Bottom Alignment Tab'])
  const topCapIds = getTargetPanelIds(template, ['Top Cap'])
  const bottomCapIds = getTargetPanelIds(template, ['Bottom Cap'])
  const faces: AssemblyFace[] = [
    { id: 'body', label: 'Body', targetIds: getTargetPanelIds(template, ['Body Wrap']) },
    { id: 'top', label: 'Top', targetIds: [...topCapIds, ...topAlignmentTabIds] },
    { id: 'bottom', label: 'Bottom', targetIds: [...bottomCapIds, ...bottomAlignmentTabIds] },
  ]
  const steps: AssemblyStep[] = [
    {
      id: 'curve-body-wrap',
      title: 'Step 1',
      instruction: 'Pre-curve the body wrap into a cylinder',
      focusFaceId: 'body',
      cueKind: 'fold-over',
      cueLabel: 'Fold Over',
      targetIds: getTargetPanelIds(template, ['Body Wrap']),
      foldIds: [],
      glueTabIds: [],
    },
    {
      id: 'glue-cylinder-seam',
      title: 'Step 2',
      instruction: 'Apply adhesive to the glue seam and close the shell',
      focusFaceId: 'body',
      cueKind: 'glue-here',
      cueLabel: 'Glue Here',
      targetIds: glueTabIds,
      foldIds: getTargetFoldIds(template, ['glue-seam']),
      glueTabIds,
    },
    {
      id: 'fold-top-alignment',
      title: 'Step 3',
      instruction: 'Fold the top alignment tabs inward',
      focusFaceId: 'top',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: topAlignmentTabIds,
      foldIds: getTargetFoldIds(template, ['top-alignment-']),
      glueTabIds: [],
    },
    {
      id: 'seat-top-cap',
      title: 'Step 4',
      instruction: 'Seat the top cap onto the folded tabs',
      focusFaceId: 'top',
      cueKind: 'press-secure',
      cueLabel: 'Press Secure',
      targetIds: [...topCapIds, ...topAlignmentTabIds],
      foldIds: [],
      glueTabIds: [],
    },
    {
      id: 'fold-bottom-alignment',
      title: 'Step 5',
      instruction: 'Fold the bottom alignment tabs inward',
      focusFaceId: 'bottom',
      cueKind: 'fold-in',
      cueLabel: 'Fold In',
      targetIds: bottomAlignmentTabIds,
      foldIds: getTargetFoldIds(template, ['bottom-alignment-']),
      glueTabIds: [],
    },
    {
      id: 'seat-bottom-cap',
      title: 'Step 6',
      instruction: 'Seat the bottom cap and press the shell secure',
      focusFaceId: 'bottom',
      cueKind: 'press-secure',
      cueLabel: 'Press Secure',
      targetIds: [...bottomCapIds, ...bottomAlignmentTabIds],
      foldIds: [],
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
