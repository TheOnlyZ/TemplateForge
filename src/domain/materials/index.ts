export type MaterialId =
  | 'printer-paper'
  | 'cardstock'
  | 'corrugated-cardboard'
  | 'foam-board'

export interface MaterialDefinition {
  id: MaterialId
  label: string
  description: string
  recommendedGlueTabWidthMm: number
  assemblyNote: string
}

const MATERIALS: Record<MaterialId, MaterialDefinition> = {
  'printer-paper': {
    id: 'printer-paper',
    label: 'Printer Paper',
    description: 'Best for quick test builds and scale checks on standard home printers.',
    recommendedGlueTabWidthMm: 12,
    assemblyNote: 'Use light adhesive and score folds gently to avoid tearing.',
  },
  cardstock: {
    id: 'cardstock',
    label: 'Cardstock',
    description: 'Sturdier and better for gift boxes, prototypes, and repeatable hobby builds.',
    recommendedGlueTabWidthMm: 16,
    assemblyNote: 'Score major folds before cutting and clamp glued seams until set.',
  },
  'corrugated-cardboard': {
    id: 'corrugated-cardboard',
    label: 'Corrugated Cardboard',
    description: 'Advisory only in MVP. Thickness compensation is not modeled yet.',
    recommendedGlueTabWidthMm: 20,
    assemblyNote: 'Treat printed dimensions as reference only until thickness-aware compensation is added.',
  },
  'foam-board': {
    id: 'foam-board',
    label: 'Foam Board',
    description: 'Advisory only in MVP. Use for planning and pattern transfer rather than direct fold accuracy.',
    recommendedGlueTabWidthMm: 22,
    assemblyNote: 'Use as a cutting guide for transferred shapes instead of assuming fold-ready output.',
  },
}

export function getMaterialDefinition(id: MaterialId): MaterialDefinition {
  return MATERIALS[id]
}

export function getMaterialOptions(): MaterialDefinition[] {
  return Object.values(MATERIALS)
}
