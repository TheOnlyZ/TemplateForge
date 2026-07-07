import type { Bounds } from '../geometry/index.ts'
import {
  type MarginConfig,
  type Orientation,
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

export function layoutTemplate(
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
      return {
        pages: [],
        pageCount: 0,
        printableAreaOverflow: true,
        hasLegalPlacement: false,
        printableArea,
      }
    }

    const nextBottom = cursorY + part.bounds.height
    if (nextBottom > printableArea.y + printableArea.height) {
      return {
        pages: [],
        pageCount: 0,
        printableAreaOverflow: true,
        hasLegalPlacement: false,
        printableArea,
      }
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
