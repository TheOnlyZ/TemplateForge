import { clampMarginConfig, getDefaultMarginConfig } from '../../domain/paper/index.ts'
import type { MaterialId } from '../../domain/materials/index.ts'
import type { BoxInput, BoxStyle } from '../../domain/shapes/box/index.ts'
import type { CylinderInput } from '../../domain/shapes/cylinder/index.ts'
import type { UnitSystem } from '../../domain/units/index.ts'
import {
  createDefaultProjectState,
  type BoxDraft,
  type BoxQueueItem,
  type BoxWizardStepId,
  type ProjectStateSnapshot,
} from '../../store/app-store.ts'

const PROJECT_FILE_VERSION = 1
const VALID_UNIT_SYSTEMS = ['metric', 'imperial'] satisfies UnitSystem[]
const VALID_DRAFT_STEPS = [
  'shape',
  'dimensions',
  'style',
  'material',
  'paper',
  'preview',
] satisfies BoxWizardStepId[]
const VALID_BOX_STYLES = ['glue-tab-carton', 'tuck-carton', 'open-tray'] satisfies BoxStyle[]
const VALID_MATERIAL_IDS = [
  'printer-paper',
  'cardstock',
  'corrugated-cardboard',
  'foam-board',
] satisfies MaterialId[]
const VALID_PAPER_SIZE_IDS = ['letter', 'legal', 'a4', 'a3'] as const
const VALID_ORIENTATIONS = ['auto', 'portrait', 'landscape'] as const

interface SavedProjectFile {
  version: number
  savedAt: string
  projectName: string
  project: ProjectStateSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function parseNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseUnitSystem(value: unknown, fallback: UnitSystem): UnitSystem {
  return VALID_UNIT_SYSTEMS.includes(value as UnitSystem) ? (value as UnitSystem) : fallback
}

function parseDraftStep(value: unknown, fallback: BoxWizardStepId): BoxWizardStepId {
  if (value === 'queue') {
    return 'preview'
  }

  return VALID_DRAFT_STEPS.includes(value as BoxWizardStepId)
    ? (value as BoxWizardStepId)
    : fallback
}

function parseBoxInput(value: unknown, fallback: BoxInput): BoxInput {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    externalLengthMm: parseNumber(value.externalLengthMm, fallback.externalLengthMm),
    externalWidthMm: parseNumber(value.externalWidthMm, fallback.externalWidthMm),
    externalHeightMm: parseNumber(value.externalHeightMm, fallback.externalHeightMm),
    glueTabWidthMm: parseNumber(value.glueTabWidthMm, fallback.glueTabWidthMm),
    style: VALID_BOX_STYLES.includes(value.style as BoxStyle) ? (value.style as BoxStyle) : fallback.style,
  }
}

function parseCylinderInput(value: unknown, fallback: CylinderInput): CylinderInput {
  if (!isRecord(value)) {
    return { ...fallback }
  }

  return {
    diameterMm: parseNumber(value.diameterMm, fallback.diameterMm),
    heightMm: parseNumber(value.heightMm, fallback.heightMm),
  }
}

function parseShapeType(value: unknown, fallback: BoxDraft['shapeType']): BoxDraft['shapeType'] {
  return value === 'box' || value === 'cylinder' ? value : fallback
}

function parseDraft(value: unknown, fallback: BoxDraft): BoxDraft {
  if (!isRecord(value)) {
    return {
      ...fallback,
      margins: { ...fallback.margins },
      boxInput: { ...fallback.boxInput },
      cylinderInput: { ...fallback.cylinderInput },
    }
  }

  return {
    name: parseString(value.name, fallback.name),
    shapeType: parseShapeType(value.shapeType, fallback.shapeType),
    materialId: VALID_MATERIAL_IDS.includes(value.materialId as MaterialId)
      ? (value.materialId as MaterialId)
      : fallback.materialId,
    paperSizeId: VALID_PAPER_SIZE_IDS.includes(value.paperSizeId as (typeof VALID_PAPER_SIZE_IDS)[number])
      ? (value.paperSizeId as (typeof VALID_PAPER_SIZE_IDS)[number])
      : fallback.paperSizeId,
    orientation: VALID_ORIENTATIONS.includes(
      value.orientation as (typeof VALID_ORIENTATIONS)[number],
    )
      ? (value.orientation as (typeof VALID_ORIENTATIONS)[number])
      : fallback.orientation,
    margins: clampMarginConfig(
      isRecord(value.margins)
        ? {
            top: parseNumber(value.margins.top, fallback.margins.top),
            right: parseNumber(value.margins.right, fallback.margins.right),
            bottom: parseNumber(value.margins.bottom, fallback.margins.bottom),
            left: parseNumber(value.margins.left, fallback.margins.left),
          }
        : { ...fallback.margins },
    ),
    boxInput: parseBoxInput(value.boxInput, fallback.boxInput),
    cylinderInput: parseCylinderInput(value.cylinderInput, fallback.cylinderInput),
  }
}

function parseQueueItems(value: unknown, fallbackDraft: BoxDraft): BoxQueueItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isRecord)
    .map((item, index) => ({
      id: parseString(item.id, `queue-item-${index + 1}`),
      ...parseDraft(item, fallbackDraft),
    }))
}

export function createProjectFileContents(snapshot: ProjectStateSnapshot, projectName: string) {
  const savedProjectFile: SavedProjectFile = {
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    projectName,
    project: {
      unitSystem: snapshot.unitSystem,
      draft: {
        ...snapshot.draft,
        margins: { ...snapshot.draft.margins },
        boxInput: { ...snapshot.draft.boxInput },
        cylinderInput: { ...snapshot.draft.cylinderInput },
      },
      draftStep: snapshot.draftStep,
      queueItems: snapshot.queueItems.map((item) => ({
        ...item,
        margins: { ...item.margins },
        boxInput: { ...item.boxInput },
        cylinderInput: { ...item.cylinderInput },
      })),
      nextQueueIndex: snapshot.nextQueueIndex,
      editingQueueItemId: snapshot.editingQueueItemId,
    },
  }

  return JSON.stringify(savedProjectFile, null, 2)
}

export function parseProjectFileContents(contents: string): ProjectStateSnapshot {
  const parsed = JSON.parse(contents) as unknown
  if (!isRecord(parsed) || parsed.version !== PROJECT_FILE_VERSION || !isRecord(parsed.project)) {
    throw new Error('Invalid TemplateForge project file.')
  }

  const project = parsed.project
  const fallbackState = createDefaultProjectState()
  const queueItems = parseQueueItems(project.queueItems, fallbackState.draft)
  const nextQueueIndex = Math.max(
    parseNumber(project.nextQueueIndex, fallbackState.nextQueueIndex),
    queueItems.length + 1,
  )
  const editingQueueItemId =
    typeof project.editingQueueItemId === 'string' &&
    queueItems.some((item) => item.id === project.editingQueueItemId)
      ? project.editingQueueItemId
      : null

  return {
    unitSystem: parseUnitSystem(project.unitSystem, fallbackState.unitSystem),
    draft: parseDraft(project.draft, fallbackState.draft),
    draftStep: parseDraftStep(project.draftStep, fallbackState.draftStep),
    queueItems,
    nextQueueIndex,
    editingQueueItemId,
  }
}

export function getDefaultProjectName(snapshot: ProjectStateSnapshot) {
  if (snapshot.queueItems.length > 0) {
    return snapshot.queueItems[0]!.name
  }

  return parseString(snapshot.draft.name, 'TemplateForge Project')
}

export function createEmptyProjectSnapshot(): ProjectStateSnapshot {
  const fallbackState = createDefaultProjectState()

  return {
    ...fallbackState,
    draft: {
      ...fallbackState.draft,
      margins: getDefaultMarginConfig(),
      boxInput: { ...fallbackState.draft.boxInput },
      cylinderInput: { ...fallbackState.draft.cylinderInput },
    },
    queueItems: [],
    editingQueueItemId: null,
  }
}
