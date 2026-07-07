import { create } from 'zustand'
import {
  type MarginConfig,
  type Orientation,
  type PaperSizeId,
  clampMarginConfig,
  getDefaultMarginConfig,
} from '../domain/paper/index.ts'
import type { MaterialId } from '../domain/materials/index.ts'
import type { BoxInput, BoxStyle } from '../domain/shapes/box/index.ts'
import type { UnitSystem } from '../domain/units/index.ts'

export type BoxWizardStepId =
  | 'dimensions'
  | 'style'
  | 'material'
  | 'paper'
  | 'preview'
  | 'queue'

export interface BoxDraft {
  name: string
  boxInput: BoxInput
  materialId: MaterialId
  paperSizeId: PaperSizeId
  orientation: Orientation
  margins: MarginConfig
}

export interface BoxQueueItem extends BoxDraft {
  id: string
}

const wizardSteps: BoxWizardStepId[] = [
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
    boxInput: {
      externalLengthMm: 120,
      externalWidthMm: 80,
      externalHeightMm: 24,
      glueTabWidthMm: 12,
      style: 'open-tray',
    },
    materialId: 'cardstock',
    paperSizeId: 'a4',
    orientation: 'portrait',
    margins: getDefaultMarginConfig(),
  }
}

interface AppState {
  unitSystem: UnitSystem
  draft: BoxDraft
  draftStep: BoxWizardStepId
  queueItems: BoxQueueItem[]
  nextQueueIndex: number
  setUnitSystem: (unitSystem: UnitSystem) => void
  setDraftName: (name: string) => void
  setDraftStyle: (style: BoxStyle) => void
  setDraftMaterialId: (materialId: MaterialId) => void
  setDraftPaperSizeId: (paperSizeId: PaperSizeId) => void
  setDraftOrientation: (orientation: Orientation) => void
  setDraftMargin: (side: keyof MarginConfig, value: number) => void
  setDraftDimension: (dimension: keyof Omit<BoxInput, 'style'>, value: number) => void
  setDraftStep: (step: BoxWizardStepId) => void
  nextDraftStep: () => void
  previousDraftStep: () => void
  addDraftToQueue: () => void
  removeQueueItem: (id: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  unitSystem: 'metric',
  draft: createDefaultDraft(1),
  draftStep: 'dimensions',
  queueItems: [],
  nextQueueIndex: 1,
  setUnitSystem: (unitSystem) => set({ unitSystem }),
  setDraftName: (name) =>
    set((state) => ({
      draft: {
        ...state.draft,
        name,
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
      const nextIndex = state.nextQueueIndex + 1

      return {
        queueItems: [
          {
            id: `queue-item-${state.nextQueueIndex}`,
            ...state.draft,
            margins: { ...state.draft.margins },
            boxInput: { ...state.draft.boxInput },
          },
          ...state.queueItems,
        ],
        nextQueueIndex: nextIndex,
        draft: createDefaultDraft(nextIndex),
        draftStep: 'dimensions',
      }
    }),
  removeQueueItem: (id) =>
    set((state) => ({
      queueItems: state.queueItems.filter((item) => item.id !== id),
    })),
}))
