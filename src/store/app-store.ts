import { create } from 'zustand'
import {
  type MarginConfig,
  type OrientationPreference,
  type PaperSizeId,
  clampMarginConfig,
  getDefaultMarginConfig,
} from '../domain/paper/index.ts'
import type { MaterialId } from '../domain/materials/index.ts'
import type { BoxInput, BoxStyle } from '../domain/shapes/box/index.ts'
import type { CylinderInput } from '../domain/shapes/cylinder/index.ts'
import type { ShapeType } from '../domain/shapes/shared/index.ts'
import type { UnitSystem } from '../domain/units/index.ts'

export type BoxWizardStepId =
  | 'shape'
  | 'dimensions'
  | 'style'
  | 'material'
  | 'paper'
  | 'preview'
  | 'queue'

export interface BoxDraft {
  name: string
  shapeType: ShapeType
  boxInput: BoxInput
  cylinderInput: CylinderInput
  materialId: MaterialId
  paperSizeId: PaperSizeId
  orientation: OrientationPreference
  margins: MarginConfig
}

export interface BoxQueueItem extends BoxDraft {
  id: string
}

export interface ProjectStateSnapshot {
  unitSystem: UnitSystem
  draft: BoxDraft
  draftStep: BoxWizardStepId
  queueItems: BoxQueueItem[]
  nextQueueIndex: number
  editingQueueItemId: string | null
}

const wizardSteps: BoxWizardStepId[] = [
  'shape',
  'dimensions',
  'style',
  'material',
  'paper',
  'preview',
  'queue',
]

function createDefaultDraft(index: number): BoxDraft {
  return {
    name: `Rectangular Box ${index}`,
    shapeType: 'box',
    boxInput: {
      externalLengthMm: 120,
      externalWidthMm: 80,
      externalHeightMm: 24,
      glueTabWidthMm: 12,
      style: 'open-tray',
    },
    cylinderInput: {
      diameterMm: 60,
      heightMm: 100,
    },
    materialId: 'cardstock',
    paperSizeId: 'letter',
    orientation: 'auto',
    margins: getDefaultMarginConfig(),
  }
}

function cloneDraft(draft: BoxDraft): BoxDraft {
  return {
    ...draft,
    margins: { ...draft.margins },
    boxInput: { ...draft.boxInput },
    cylinderInput: { ...draft.cylinderInput },
  }
}

function cloneQueueItem(item: BoxQueueItem): BoxQueueItem {
  return {
    ...cloneDraft(item),
    id: item.id,
  }
}

export function createDefaultProjectState(): ProjectStateSnapshot {
  return {
    unitSystem: 'metric',
    draft: createDefaultDraft(1),
    draftStep: 'shape',
    queueItems: [],
    nextQueueIndex: 1,
    editingQueueItemId: null,
  }
}

interface AppState {
  unitSystem: UnitSystem
  draft: BoxDraft
  draftStep: BoxWizardStepId
  queueItems: BoxQueueItem[]
  nextQueueIndex: number
  editingQueueItemId: string | null
  setUnitSystem: (unitSystem: UnitSystem) => void
  setDraftName: (name: string) => void
  setDraftShapeType: (shapeType: ShapeType) => void
  setDraftStyle: (style: BoxStyle) => void
  setDraftMaterialId: (materialId: MaterialId) => void
  setDraftPaperSizeId: (paperSizeId: PaperSizeId) => void
  setDraftOrientation: (orientation: OrientationPreference) => void
  setDraftMargin: (side: keyof MarginConfig, value: number) => void
  setDraftDimension: (dimension: keyof Omit<BoxInput, 'style'>, value: number) => void
  setDraftCylinderDimension: (dimension: keyof CylinderInput, value: number) => void
  setDraftStep: (step: BoxWizardStepId) => void
  nextDraftStep: () => void
  previousDraftStep: () => void
  addDraftToQueue: () => void
  removeQueueItem: (id: string) => void
  duplicateQueueItem: (id: string) => void
  startEditingQueueItem: (id: string) => void
  cancelEditingQueueItem: () => void
  loadProjectSnapshot: (snapshot: ProjectStateSnapshot) => void
}

export const useAppStore = create<AppState>((set) => ({
  ...createDefaultProjectState(),
  setUnitSystem: (unitSystem) => set({ unitSystem }),
  setDraftName: (name) =>
    set((state) => ({
      draft: {
        ...state.draft,
        name,
      },
    })),
  setDraftShapeType: (shapeType) =>
    set((state) => ({
      draft: {
        ...state.draft,
        shapeType,
      },
    })),
  setDraftStyle: (style) =>
    set((state) => ({
      draft: {
        ...state.draft,
        boxInput: {
          ...state.draft.boxInput,
          style,
        },
      },
    })),
  setDraftMaterialId: (materialId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        materialId,
      },
    })),
  setDraftPaperSizeId: (paperSizeId) =>
    set((state) => ({
      draft: {
        ...state.draft,
        paperSizeId,
      },
    })),
  setDraftOrientation: (orientation) =>
    set((state) => ({
      draft: {
        ...state.draft,
        orientation,
      },
    })),
  setDraftMargin: (side, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        margins: clampMarginConfig({
          ...state.draft.margins,
          [side]: value,
        }),
      },
    })),
  setDraftDimension: (dimension, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        boxInput: {
          ...state.draft.boxInput,
          [dimension]: value,
        },
      },
    })),
  setDraftCylinderDimension: (dimension, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        cylinderInput: {
          ...state.draft.cylinderInput,
          [dimension]: value,
        },
      },
    })),
  setDraftStep: (step) => set({ draftStep: step }),
  nextDraftStep: () =>
    set((state) => {
      const index = wizardSteps.indexOf(state.draftStep)

      return {
        draftStep: wizardSteps[Math.min(index + 1, wizardSteps.length - 1)]!,
      }
    }),
  previousDraftStep: () =>
    set((state) => {
      const index = wizardSteps.indexOf(state.draftStep)

      return {
        draftStep: wizardSteps[Math.max(index - 1, 0)]!,
      }
    }),
  addDraftToQueue: () =>
    set((state) => {
      if (state.editingQueueItemId !== null) {
        return {
          queueItems: state.queueItems.map((item) =>
            item.id === state.editingQueueItemId
              ? {
                  ...item,
                  ...cloneDraft(state.draft),
                }
              : item,
          ),
          draft: createDefaultDraft(state.nextQueueIndex),
          draftStep: 'dimensions',
          editingQueueItemId: null,
        }
      }

      const nextIndex = state.nextQueueIndex + 1

      return {
        queueItems: [
          {
            id: `queue-item-${state.nextQueueIndex}`,
            ...state.draft,
            margins: { ...state.draft.margins },
            boxInput: { ...state.draft.boxInput },
            cylinderInput: { ...state.draft.cylinderInput },
          },
          ...state.queueItems,
        ],
        nextQueueIndex: nextIndex,
        draft: createDefaultDraft(nextIndex),
        draftStep: 'dimensions',
        editingQueueItemId: null,
      }
    }),
  removeQueueItem: (id) =>
    set((state) =>
      state.editingQueueItemId === id
        ? {
            queueItems: state.queueItems.filter((item) => item.id !== id),
            draft: createDefaultDraft(state.nextQueueIndex),
            draftStep: 'dimensions',
            editingQueueItemId: null,
          }
        : {
            queueItems: state.queueItems.filter((item) => item.id !== id),
          },
    ),
  duplicateQueueItem: (id) =>
    set((state) => {
      const sourceItem = state.queueItems.find((item) => item.id === id)
      if (!sourceItem) {
        return {}
      }

      return {
        queueItems: [
          {
            ...cloneDraft(sourceItem),
            id: `queue-item-${state.nextQueueIndex}`,
            name: `${sourceItem.name} Copy`,
          },
          ...state.queueItems,
        ],
        nextQueueIndex: state.nextQueueIndex + 1,
      }
    }),
  startEditingQueueItem: (id) =>
    set((state) => {
      const sourceItem = state.queueItems.find((item) => item.id === id)
      if (!sourceItem) {
        return {}
      }

      return {
        draft: cloneDraft(sourceItem),
        draftStep: 'dimensions',
        editingQueueItemId: sourceItem.id,
      }
    }),
  cancelEditingQueueItem: () =>
    set((state) => ({
      draft: createDefaultDraft(state.nextQueueIndex),
      draftStep: 'dimensions',
      editingQueueItemId: null,
    })),
  loadProjectSnapshot: (snapshot) =>
    set({
      unitSystem: snapshot.unitSystem,
      draft: cloneDraft(snapshot.draft),
      draftStep: snapshot.draftStep,
      queueItems: snapshot.queueItems.map(cloneQueueItem),
      nextQueueIndex: snapshot.nextQueueIndex,
      editingQueueItemId: snapshot.queueItems.some((item) => item.id === snapshot.editingQueueItemId)
        ? snapshot.editingQueueItemId
        : null,
    }),
}))
