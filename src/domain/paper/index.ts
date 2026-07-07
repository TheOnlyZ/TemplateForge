import type { Bounds } from '../geometry/index.ts'

export type PaperSizeId = 'letter' | 'legal' | 'a4' | 'a3'
export type PaperFamily = 'us' | 'international'
export type Orientation = 'portrait' | 'landscape'
export type OrientationPreference = Orientation | 'auto'

export interface OrientedPaperDimensions {
  widthMm: number
  heightMm: number
}

export interface PaperDefinition {
  id: PaperSizeId
  family: PaperFamily
  label: string
  widthMm: number
  heightMm: number
}

export interface MarginConfig {
  top: number
  right: number
  bottom: number
  left: number
}

export interface PrintableArea {
  x: number
  y: number
  width: number
  height: number
  bounds: Bounds
}

export const DEFAULT_MARGIN_MM = 6.35
export const MIN_MARGIN_MM = 3
export const MAX_MARGIN_MM = 25.4

const PAPER_DEFINITIONS: Record<PaperSizeId, PaperDefinition> = {
  letter: { id: 'letter', family: 'us', label: 'Letter (US standard)', widthMm: 215.9, heightMm: 279.4 },
  legal: { id: 'legal', family: 'us', label: 'Legal (US standard)', widthMm: 215.9, heightMm: 355.6 },
  a4: { id: 'a4', family: 'international', label: 'A4 (International standard)', widthMm: 210, heightMm: 297 },
  a3: { id: 'a3', family: 'international', label: 'A3 (International standard)', widthMm: 297, heightMm: 420 },
}

const PAPER_SIZE_ORDER: PaperSizeId[] = ['letter', 'legal', 'a4', 'a3']

function clampMargin(value: number) {
  return Math.min(MAX_MARGIN_MM, Math.max(MIN_MARGIN_MM, value))
}

function roundMm(value: number) {
  return Math.round(value * 1_000) / 1_000
}

export function getPaperDefinition(id: PaperSizeId): PaperDefinition {
  return PAPER_DEFINITIONS[id]
}

export function getPaperSizeOptions(): PaperDefinition[] {
  return PAPER_SIZE_ORDER.map((id) => PAPER_DEFINITIONS[id])
}

export function getOrientedPaperDimensions(
  paper: PaperDefinition,
  orientation: Orientation,
): OrientedPaperDimensions {
  if (orientation === 'landscape') {
    return {
      widthMm: paper.heightMm,
      heightMm: paper.widthMm,
    }
  }

  return {
    widthMm: paper.widthMm,
    heightMm: paper.heightMm,
  }
}

export function getDefaultMarginConfig(): MarginConfig {
  return {
    top: DEFAULT_MARGIN_MM,
    right: DEFAULT_MARGIN_MM,
    bottom: DEFAULT_MARGIN_MM,
    left: DEFAULT_MARGIN_MM,
  }
}

export function clampMarginConfig(margins: MarginConfig): MarginConfig {
  return {
    top: clampMargin(margins.top),
    right: clampMargin(margins.right),
    bottom: clampMargin(margins.bottom),
    left: clampMargin(margins.left),
  }
}

export function getPrintableArea(
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): PrintableArea {
  const clampedMargins = clampMarginConfig(margins)
  const { widthMm, heightMm } = getOrientedPaperDimensions(paper, orientation)
  const x = clampedMargins.left
  const y = clampedMargins.top
  const width = roundMm(Math.max(0, widthMm - clampedMargins.left - clampedMargins.right))
  const height = roundMm(Math.max(0, heightMm - clampedMargins.top - clampedMargins.bottom))
  const bounds: Bounds = {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
    width,
    height,
  }

  return {
    x,
    y,
    width,
    height,
    bounds,
  }
}
