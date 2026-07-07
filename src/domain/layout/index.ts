import type { Bounds } from '../geometry/index.ts'
import {
  type MarginConfig,
  type Orientation,
  type OrientationPreference,
  type PaperDefinition,
  type PrintableArea,
  getPrintableArea,
} from '../paper/index.ts'
import type { TemplateItem, TemplatePartPlacement } from '../templates/index.ts'

export interface LayoutPage {
  id: string
  pageNumber: number
  paperSizeId: string
  orientation: Orientation
  printableBounds: Bounds
  partPlacements: TemplatePartPlacement[]
}

export interface LayoutResult {
  pages: LayoutPage[]
  pageCount: number
  printableAreaOverflow: boolean
  hasLegalPlacement: boolean
  printableArea: PrintableArea
}

const PART_GAP_MM = 10

interface LayoutFootprint {
  width: number
  height: number
}

interface LayoutCandidate {
  result: LayoutResult
  overflowMm: number
  aspectDelta: number
}

function getTemplateFootprint(template: TemplateItem): LayoutFootprint {
  if (template.parts.length === 0) {
    return { width: 0, height: 0 }
  }

  let width = 0
  let height = 0

  for (const part of template.parts) {
    width = Math.max(width, part.bounds.width)
    height += part.bounds.height
  }

  height += PART_GAP_MM * Math.max(0, template.parts.length - 1)

  return { width, height }
}

function createOverflowResult(printableArea: PrintableArea): LayoutResult {
  return {
    pages: [],
    pageCount: 0,
    printableAreaOverflow: true,
    hasLegalPlacement: false,
    printableArea,
  }
}

function layoutTemplateForOrientation(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): LayoutResult {
  const printableArea = getPrintableArea(paper, orientation, margins)
  const partPlacements: TemplatePartPlacement[] = []
  let cursorY = printableArea.y

  for (const part of template.parts) {
    if (part.bounds.width > printableArea.width || part.bounds.height > printableArea.height) {
      return createOverflowResult(printableArea)
    }

    const nextBottom = cursorY + part.bounds.height
    if (nextBottom > printableArea.y + printableArea.height) {
      return createOverflowResult(printableArea)
    }

    partPlacements.push({
      partId: part.id,
      offsetX: printableArea.x + (printableArea.width - part.bounds.width) / 2 - part.bounds.minX,
      offsetY: cursorY - part.bounds.minY,
      bounds: part.bounds,
    })

    cursorY = nextBottom + PART_GAP_MM
  }

  return {
    pages: [
      {
        id: `${template.id}:page:1`,
        pageNumber: 1,
        paperSizeId: paper.id,
        orientation,
        printableBounds: printableArea.bounds,
        partPlacements,
      },
    ],
    pageCount: 1,
    printableAreaOverflow: false,
    hasLegalPlacement: true,
    printableArea,
  }
}

function buildLayoutCandidate(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): LayoutCandidate {
  const result = layoutTemplateForOrientation(template, paper, orientation, margins)
  const footprint = getTemplateFootprint(template)
  const widthOverflow = Math.max(0, footprint.width - result.printableArea.width)
  const heightOverflow = Math.max(0, footprint.height - result.printableArea.height)
  const footprintAspect = footprint.height === 0 ? 1 : footprint.width / footprint.height
  const printableAspect =
    result.printableArea.height === 0 ? 1 : result.printableArea.width / result.printableArea.height

  return {
    result,
    overflowMm: widthOverflow + heightOverflow,
    aspectDelta: Math.abs(footprintAspect - printableAspect),
  }
}

function chooseAutoLayout(first: LayoutCandidate, second: LayoutCandidate): LayoutResult {
  if (first.result.hasLegalPlacement !== second.result.hasLegalPlacement) {
    return first.result.hasLegalPlacement ? first.result : second.result
  }

  if (!first.result.hasLegalPlacement && !second.result.hasLegalPlacement) {
    return first.overflowMm <= second.overflowMm ? first.result : second.result
  }

  if (first.aspectDelta !== second.aspectDelta) {
    return first.aspectDelta <= second.aspectDelta ? first.result : second.result
  }

  return first.result
}

export function layoutTemplate(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: OrientationPreference,
  margins: MarginConfig,
): LayoutResult {
  if (orientation !== 'auto') {
    return layoutTemplateForOrientation(template, paper, orientation, margins)
  }

  return chooseAutoLayout(
    buildLayoutCandidate(template, paper, 'portrait', margins),
    buildLayoutCandidate(template, paper, 'landscape', margins),
  )
}
