import type { Bounds, Point } from '../geometry/index.ts'
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
  tileRow: number
  tileColumn: number
  tileRows: number
  tileColumns: number
  printableBounds: Bounds
  partPlacements: TemplatePartPlacement[]
  registrationMarks: LayoutRegistrationMark[]
  alignmentGuides: LayoutAlignmentGuide[]
  assemblyLabels: LayoutAssemblyLabel[]
  joinIndicators: LayoutJoinIndicator[]
  overlapRegions: LayoutOverlapRegion[]
}

export interface LayoutResult {
  pages: LayoutPage[]
  pageCount: number
  printableAreaOverflow: boolean
  hasLegalPlacement: boolean
  printableArea: PrintableArea
}

const PART_GAP_MM = 10

export type LayoutPageEdge = 'top' | 'right' | 'bottom' | 'left'

export interface LayoutRegistrationMark {
  id: string
  edge: LayoutPageEdge
  x: number
  y: number
  groupId: string
}

export interface LayoutAlignmentGuide {
  id: string
  edge: LayoutPageEdge
  start: Point
  end: Point
  groupId: string
}

export interface LayoutAssemblyLabel {
  id: string
  edge: LayoutPageEdge
  x: number
  y: number
  text: string
  targetPageNumber: number
  groupId: string
}

export interface LayoutJoinIndicator {
  id: string
  edge: LayoutPageEdge
  x: number
  y: number
  text: string
  targetPageNumber: number
  groupId: string
}

export interface LayoutOverlapRegion {
  id: string
  edge: LayoutPageEdge
  bounds: Bounds
  targetPageNumber: number
  groupId: string
}

interface LayoutFootprint {
  width: number
  height: number
}

interface LayoutCandidate {
  result: LayoutResult
  overflowMm: number
  aspectDelta: number
}

interface PlacementAttempt {
  placements: TemplatePartPlacement[]
  overflowMm: number
  usedWidth: number
  usedHeight: number
  usedArea: number
}

interface RowShelf {
  y: number
  height: number
  nextX: number
}

interface ColumnShelf {
  x: number
  width: number
  nextY: number
}


function compareNumbersDescending(first: number, second: number) {
  return second - first
}

function compareStringsAscending(first: string, second: string) {
  return first.localeCompare(second)
}

function getPartArea(part: TemplateItem['parts'][number]) {
  return part.bounds.width * part.bounds.height
}

function sortPartsForLayout(parts: TemplateItem['parts']) {
  const original = [...parts]
  const byHeight = [...parts].sort(
    (first, second) =>
      compareNumbersDescending(first.bounds.height, second.bounds.height) ||
      compareNumbersDescending(first.bounds.width, second.bounds.width) ||
      compareStringsAscending(first.id, second.id),
  )
  const byWidth = [...parts].sort(
    (first, second) =>
      compareNumbersDescending(first.bounds.width, second.bounds.width) ||
      compareNumbersDescending(first.bounds.height, second.bounds.height) ||
      compareStringsAscending(first.id, second.id),
  )
  const byArea = [...parts].sort(
    (first, second) =>
      compareNumbersDescending(getPartArea(first), getPartArea(second)) ||
      compareNumbersDescending(first.bounds.height, second.bounds.height) ||
      compareStringsAscending(first.id, second.id),
  )

  return [original, byHeight, byWidth, byArea]
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

function getPlacementBounds(placements: TemplatePartPlacement[]): Bounds {
  if (placements.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    }
  }

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const placement of placements) {
    minX = Math.min(minX, placement.offsetX + placement.bounds.minX)
    minY = Math.min(minY, placement.offsetY + placement.bounds.minY)
    maxX = Math.max(maxX, placement.offsetX + placement.bounds.maxX)
    maxY = Math.max(maxY, placement.offsetY + placement.bounds.maxY)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

function measurePlacements(placements: TemplatePartPlacement[]): LayoutFootprint & { area: number } {
  const bounds = getPlacementBounds(placements)

  return {
    width: bounds.width,
    height: bounds.height,
    area: bounds.width * bounds.height,
  }
}




function centerPlacements(
  placements: TemplatePartPlacement[],
  printableArea: PrintableArea,
): TemplatePartPlacement[] {
  if (placements.length === 0) {
    return placements
  }

  const bounds = getPlacementBounds(placements)
  const shiftX = printableArea.x + (printableArea.width - bounds.width) / 2 - bounds.minX
  const shiftY = printableArea.y + (printableArea.height - bounds.height) / 2 - bounds.minY

  return placements.map((placement) => ({
    ...placement,
    offsetX: placement.offsetX + shiftX,
    offsetY: placement.offsetY + shiftY,
  }))
}

function buildPlacementAttempt(
  placements: TemplatePartPlacement[],
  printableArea: PrintableArea,
): PlacementAttempt {
  const centeredPlacements = centerPlacements(placements, printableArea)
  const measurement = measurePlacements(centeredPlacements)

  return {
    placements: centeredPlacements,
    overflowMm: 0,
    usedWidth: measurement.width,
    usedHeight: measurement.height,
    usedArea: measurement.area,
  }
}

function createOverflowAttempt(printableArea: PrintableArea, overflowMm: number): PlacementAttempt {
  return {
    placements: [],
    overflowMm,
    usedWidth: printableArea.width,
    usedHeight: printableArea.height,
    usedArea: printableArea.width * printableArea.height,
  }
}




function packPartsIntoRows(
  parts: TemplateItem['parts'],
  printableArea: PrintableArea,
): PlacementAttempt {
  const areaRight = printableArea.x + printableArea.width
  const areaBottom = printableArea.y + printableArea.height
  const shelves: RowShelf[] = []
  const placements: TemplatePartPlacement[] = []

  for (const part of parts) {
    if (part.bounds.width > printableArea.width || part.bounds.height > printableArea.height) {
      return createOverflowAttempt(
        printableArea,
        Math.max(part.bounds.width - printableArea.width, part.bounds.height - printableArea.height),
      )
    }

    let targetShelf: RowShelf | undefined
    let targetX = printableArea.x
    let smallestRemainingWidth = Number.POSITIVE_INFINITY

    for (const shelf of shelves) {
      if (part.bounds.height > shelf.height) {
        continue
      }

      const placeX = shelf.nextX === printableArea.x ? shelf.nextX : shelf.nextX + PART_GAP_MM
      const remainingWidth = areaRight - (placeX + part.bounds.width)

      if (remainingWidth < 0) {
        continue
      }

      if (remainingWidth < smallestRemainingWidth) {
        targetShelf = shelf
        targetX = placeX
        smallestRemainingWidth = remainingWidth
      }
    }

    if (targetShelf === undefined) {
      const previousShelf = shelves.at(-1)
      const nextY =
        previousShelf === undefined
          ? printableArea.y
          : previousShelf.y + previousShelf.height + PART_GAP_MM

      if (nextY + part.bounds.height > areaBottom) {
        return createOverflowAttempt(printableArea, nextY + part.bounds.height - areaBottom)
      }

      targetShelf = {
        y: nextY,
        height: part.bounds.height,
        nextX: printableArea.x,
      }
      shelves.push(targetShelf)
      targetX = printableArea.x
    }

    placements.push({
      partId: part.id,
      offsetX: targetX - part.bounds.minX,
      offsetY: targetShelf.y - part.bounds.minY,
      bounds: part.bounds,
    })

    targetShelf.nextX = targetX + part.bounds.width
  }

  return buildPlacementAttempt(placements, printableArea)
}

function packPartsIntoColumns(
  parts: TemplateItem['parts'],
  printableArea: PrintableArea,
): PlacementAttempt {
  const areaRight = printableArea.x + printableArea.width
  const areaBottom = printableArea.y + printableArea.height
  const shelves: ColumnShelf[] = []
  const placements: TemplatePartPlacement[] = []

  for (const part of parts) {
    if (part.bounds.width > printableArea.width || part.bounds.height > printableArea.height) {
      return createOverflowAttempt(
        printableArea,
        Math.max(part.bounds.width - printableArea.width, part.bounds.height - printableArea.height),
      )
    }

    let targetShelf: ColumnShelf | undefined
    let targetY = printableArea.y
    let smallestRemainingHeight = Number.POSITIVE_INFINITY

    for (const shelf of shelves) {
      if (part.bounds.width > shelf.width) {
        continue
      }

      const placeY = shelf.nextY === printableArea.y ? shelf.nextY : shelf.nextY + PART_GAP_MM
      const remainingHeight = areaBottom - (placeY + part.bounds.height)

      if (remainingHeight < 0) {
        continue
      }

      if (remainingHeight < smallestRemainingHeight) {
        targetShelf = shelf
        targetY = placeY
        smallestRemainingHeight = remainingHeight
      }
    }

    if (targetShelf === undefined) {
      const previousShelf = shelves.at(-1)
      const nextX =
        previousShelf === undefined
          ? printableArea.x
          : previousShelf.x + previousShelf.width + PART_GAP_MM

      if (nextX + part.bounds.width > areaRight) {
        return createOverflowAttempt(printableArea, nextX + part.bounds.width - areaRight)
      }

      targetShelf = {
        x: nextX,
        width: part.bounds.width,
        nextY: printableArea.y,
      }
      shelves.push(targetShelf)
      targetY = printableArea.y
    }

    placements.push({
      partId: part.id,
      offsetX: targetShelf.x - part.bounds.minX,
      offsetY: targetY - part.bounds.minY,
      bounds: part.bounds,
    })

    targetShelf.nextY = targetY + part.bounds.height
  }

  return buildPlacementAttempt(placements, printableArea)
}

function chooseBestPlacementAttempt(attempts: PlacementAttempt[]): PlacementAttempt {
  const legalAttempts = attempts.filter((attempt) => attempt.overflowMm === 0)

  if (legalAttempts.length > 0) {
    return legalAttempts.reduce((best, current) => {
      if (current.usedArea !== best.usedArea) {
        return current.usedArea < best.usedArea ? current : best
      }

      if (current.usedHeight !== best.usedHeight) {
        return current.usedHeight < best.usedHeight ? current : best
      }

      if (current.usedWidth !== best.usedWidth) {
        return current.usedWidth < best.usedWidth ? current : best
      }

      return best
    })
  }

  return attempts.reduce((best, current) => (current.overflowMm < best.overflowMm ? current : best))
}

function optimizePartPlacements(
  template: TemplateItem,
  printableArea: PrintableArea,
): PlacementAttempt {
  const partOrderings = sortPartsForLayout(template.parts)
  const attempts = partOrderings.flatMap((parts) => [
    packPartsIntoRows(parts, printableArea),
    packPartsIntoColumns(parts, printableArea),
  ])

  return chooseBestPlacementAttempt(attempts)
}

function createPlacedLayoutResult(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  printableArea: PrintableArea,
  partPlacements: TemplatePartPlacement[],
): LayoutResult {
  return {
    pages: [
      {
        id: `${template.id}:page:1`,
        pageNumber: 1,
        paperSizeId: paper.id,
        orientation,
        tileRow: 1,
        tileColumn: 1,
        tileRows: 1,
        tileColumns: 1,
        printableBounds: printableArea.bounds,
        partPlacements,
        registrationMarks: [],
        alignmentGuides: [],
        assemblyLabels: [],
        joinIndicators: [],
        overlapRegions: [],
      },
    ],
    pageCount: 1,
    printableAreaOverflow: false,
    hasLegalPlacement: true,
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
  const placementAttempt = optimizePartPlacements(template, printableArea)

  if (placementAttempt.overflowMm > 0) {
    return createOverflowResult(printableArea)
  }

  return createPlacedLayoutResult(
    template,
    paper,
    orientation,
    printableArea,
    placementAttempt.placements,
  )
}

function buildLayoutCandidate(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): LayoutCandidate {
  const printableArea = getPrintableArea(paper, orientation, margins)
  const placementAttempt = optimizePartPlacements(template, printableArea)
  const printableAspect =
    printableArea.height === 0 ? 1 : printableArea.width / printableArea.height

  if (placementAttempt.overflowMm === 0) {
    const result = createPlacedLayoutResult(
      template,
      paper,
      orientation,
      printableArea,
      placementAttempt.placements,
    )

    return {
      result,
      overflowMm: 0,
      aspectDelta:
        placementAttempt.usedHeight === 0
          ? 0
          : Math.abs(placementAttempt.usedWidth / placementAttempt.usedHeight - printableAspect),
    }
  }

  const result = createOverflowResult(printableArea)
  const footprint = getTemplateFootprint(template)

  return {
    result,
    overflowMm: placementAttempt.overflowMm,
    aspectDelta:
      footprint.height === 0 ? 0 : Math.abs(footprint.width / footprint.height - printableAspect),
  }
}

function chooseAutoLayout(first: LayoutCandidate, second: LayoutCandidate): LayoutResult {
  if (first.result.hasLegalPlacement !== second.result.hasLegalPlacement) {
    return first.result.hasLegalPlacement ? first.result : second.result
  }

  if (!first.result.hasLegalPlacement && !second.result.hasLegalPlacement) {
    return first.overflowMm <= second.overflowMm ? first.result : second.result
  }

  if (first.result.pageCount !== second.result.pageCount) {
    return first.result.pageCount <= second.result.pageCount ? first.result : second.result
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
