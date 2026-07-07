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
const REGISTRATION_MARK_OFFSET_MM = 18
const REGISTRATION_MARK_INSET_MM = 7
const ALIGNMENT_GUIDE_LENGTH_MM = 14
const TILE_OVERLAP_MM = 12

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

interface TilingAttempt {
  placements: TemplatePartPlacement[]
  pageCount: number
  pageColumns: number
  pageRows: number
  usedWidth: number
  usedHeight: number
  usedArea: number
}

interface PageAlignmentArtifacts {
  registrationMarks: LayoutRegistrationMark[]
  alignmentGuides: LayoutAlignmentGuide[]
  assemblyLabels: LayoutAssemblyLabel[]
  joinIndicators: LayoutJoinIndicator[]
  overlapRegions: LayoutOverlapRegion[]
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

function normalizePlacementsToOrigin(placements: TemplatePartPlacement[]): TemplatePartPlacement[] {
  if (placements.length === 0) {
    return placements
  }

  const bounds = getPlacementBounds(placements)

  return placements.map((placement) => ({
    ...placement,
    offsetX: placement.offsetX - bounds.minX,
    offsetY: placement.offsetY - bounds.minY,
  }))
}

function createVirtualPrintableArea(width: number, height: number): PrintableArea {
  return {
    x: 0,
    y: 0,
    width,
    height,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height,
      width,
      height,
    },
  }
}

function roundMm(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function intersectsBounds(first: Bounds, second: Bounds) {
  return !(
    first.maxX <= second.minX ||
    first.minX >= second.maxX ||
    first.maxY <= second.minY ||
    first.minY >= second.maxY
  )
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

function getAggregatePartDimensions(parts: TemplateItem['parts']) {
  let maxWidth = 0
  let maxHeight = 0
  let totalWidth = 0
  let totalHeight = 0

  for (const [index, part] of parts.entries()) {
    maxWidth = Math.max(maxWidth, part.bounds.width)
    maxHeight = Math.max(maxHeight, part.bounds.height)
    totalWidth += part.bounds.width
    totalHeight += part.bounds.height

    if (index > 0) {
      totalWidth += PART_GAP_MM
      totalHeight += PART_GAP_MM
    }
  }

  return {
    maxWidth,
    maxHeight,
    totalWidth,
    totalHeight,
  }
}

function buildLimitCandidates(totalSize: number, pageSize: number, minimumSize: number) {
  const candidates = new Set<number>()
  const maxPageSpan = Math.max(1, Math.ceil(Math.max(totalSize, minimumSize) / pageSize))

  for (let span = 1; span <= maxPageSpan; span += 1) {
    candidates.add(Math.max(minimumSize, pageSize * span))
  }

  candidates.add(Math.max(minimumSize, totalSize))

  return Array.from(candidates).sort((first, second) => first - second)
}

function buildTilingAttempt(
  placements: TemplatePartPlacement[],
  printableArea: PrintableArea,
): TilingAttempt {
  const normalizedPlacements = normalizePlacementsToOrigin(placements)
  const measurement = measurePlacements(normalizedPlacements)
  const strideX = Math.max(1, printableArea.width - TILE_OVERLAP_MM)
  const strideY = Math.max(1, printableArea.height - TILE_OVERLAP_MM)
  const pageColumns =
    measurement.width <= printableArea.width
      ? 1
      : Math.ceil((measurement.width - TILE_OVERLAP_MM) / strideX)
  const pageRows =
    measurement.height <= printableArea.height
      ? 1
      : Math.ceil((measurement.height - TILE_OVERLAP_MM) / strideY)

  return {
    placements: normalizedPlacements,
    pageCount: pageColumns * pageRows,
    pageColumns,
    pageRows,
    usedWidth: measurement.width,
    usedHeight: measurement.height,
    usedArea: measurement.area,
  }
}

function buildEdgeAnchorPositions(start: number, end: number) {
  const span = end - start
  const first = roundMm(Math.min(start + REGISTRATION_MARK_OFFSET_MM, start + span / 2))
  const second = roundMm(Math.max(end - REGISTRATION_MARK_OFFSET_MM, first))

  if (Math.abs(second - first) < 8) {
    return [roundMm(start + span / 2)]
  }

  return [first, second]
}

function buildPageAlignmentArtifacts(
  templateId: string,
  printableBounds: Bounds,
  row: number,
  column: number,
  rowCount: number,
  columnCount: number,
): PageAlignmentArtifacts {
  const registrationMarks: LayoutRegistrationMark[] = []
  const alignmentGuides: LayoutAlignmentGuide[] = []

  const assemblyLabels: LayoutAssemblyLabel[] = []
  const joinIndicators: LayoutJoinIndicator[] = []
  const overlapRegions: LayoutOverlapRegion[] = []

  function getTilePageNumber(tileRow: number, tileColumn: number) {
    return tileRow * columnCount + tileColumn + 1
  }

  function getAssemblyLabelPosition(edge: LayoutPageEdge): Point {
    if (edge === 'left') {
      return {
        x: roundMm(printableBounds.minX + REGISTRATION_MARK_INSET_MM + ALIGNMENT_GUIDE_LENGTH_MM + 16),
        y: roundMm((printableBounds.minY + printableBounds.maxY) / 2),
      }
    }

    if (edge === 'right') {
      return {
        x: roundMm(printableBounds.maxX - REGISTRATION_MARK_INSET_MM - ALIGNMENT_GUIDE_LENGTH_MM - 16),
        y: roundMm((printableBounds.minY + printableBounds.maxY) / 2),
      }
    }

    if (edge === 'top') {
      return {
        x: roundMm((printableBounds.minX + printableBounds.maxX) / 2),
        y: roundMm(printableBounds.minY + REGISTRATION_MARK_INSET_MM + ALIGNMENT_GUIDE_LENGTH_MM + 5),
      }
    }

    return {
      x: roundMm((printableBounds.minX + printableBounds.maxX) / 2),
      y: roundMm(printableBounds.maxY - REGISTRATION_MARK_INSET_MM - ALIGNMENT_GUIDE_LENGTH_MM - 5),
    }
  }

  function getJoinIndicatorPosition(edge: LayoutPageEdge, anchors: number[]): Point {
    const primaryAnchor = anchors[0] ?? roundMm((printableBounds.minY + printableBounds.maxY) / 2)

    if (edge === 'left') {
      return {
        x: roundMm(printableBounds.minX + TILE_OVERLAP_MM / 2),
        y: primaryAnchor,
      }
    }

    if (edge === 'right') {
      return {
        x: roundMm(printableBounds.maxX - TILE_OVERLAP_MM / 2),
        y: primaryAnchor,
      }
    }

    if (edge === 'top') {
      return {
        x: anchors[0] ?? roundMm((printableBounds.minX + printableBounds.maxX) / 2),
        y: roundMm(printableBounds.minY + TILE_OVERLAP_MM / 2),
      }
    }

    return {
      x: anchors[0] ?? roundMm((printableBounds.minX + printableBounds.maxX) / 2),
      y: roundMm(printableBounds.maxY - TILE_OVERLAP_MM / 2),
    }
  }

  function getOverlapBounds(edge: LayoutPageEdge): Bounds {
    if (edge === 'left') {
      return {
        minX: printableBounds.minX,
        minY: printableBounds.minY,
        maxX: roundMm(printableBounds.minX + TILE_OVERLAP_MM),
        maxY: printableBounds.maxY,
        width: TILE_OVERLAP_MM,
        height: printableBounds.height,
      }
    }

    if (edge === 'right') {
      return {
        minX: roundMm(printableBounds.maxX - TILE_OVERLAP_MM),
        minY: printableBounds.minY,
        maxX: printableBounds.maxX,
        maxY: printableBounds.maxY,
        width: TILE_OVERLAP_MM,
        height: printableBounds.height,
      }
    }

    if (edge === 'top') {
      return {
        minX: printableBounds.minX,
        minY: printableBounds.minY,
        maxX: printableBounds.maxX,
        maxY: roundMm(printableBounds.minY + TILE_OVERLAP_MM),
        width: printableBounds.width,
        height: TILE_OVERLAP_MM,
      }
    }

    return {
      minX: printableBounds.minX,
      minY: roundMm(printableBounds.maxY - TILE_OVERLAP_MM),
      maxX: printableBounds.maxX,
      maxY: printableBounds.maxY,
      width: printableBounds.width,
      height: TILE_OVERLAP_MM,
    }
  }

  function pushEdgeArtifacts(edge: LayoutPageEdge, anchors: number[], targetPageNumber: number) {
    const groupPrefix = `${templateId}:tile:${row + 1}:${column + 1}:${edge}`
    const currentPageNumber = getTilePageNumber(row, column)
    const joinCode = `J${Math.min(currentPageNumber, targetPageNumber)}-${Math.max(currentPageNumber, targetPageNumber)}`

    for (const [index, anchor] of anchors.entries()) {
      let x = printableBounds.minX
      let y = printableBounds.minY
      let start: Point = { x, y }
      let end: Point = { x, y }

      if (edge === 'left') {
        x = roundMm(printableBounds.minX + REGISTRATION_MARK_INSET_MM)
        y = anchor
        start = { x, y }
        end = { x: roundMm(x + ALIGNMENT_GUIDE_LENGTH_MM), y }
      } else if (edge === 'right') {
        x = roundMm(printableBounds.maxX - REGISTRATION_MARK_INSET_MM)
        y = anchor
        start = { x, y }
        end = { x: roundMm(x - ALIGNMENT_GUIDE_LENGTH_MM), y }
      } else if (edge === 'top') {
        x = anchor
        y = roundMm(printableBounds.minY + REGISTRATION_MARK_INSET_MM)
        start = { x, y }
        end = { x, y: roundMm(y + ALIGNMENT_GUIDE_LENGTH_MM) }
      } else {
        x = anchor
        y = roundMm(printableBounds.maxY - REGISTRATION_MARK_INSET_MM)
        start = { x, y }
        end = { x, y: roundMm(y - ALIGNMENT_GUIDE_LENGTH_MM) }
      }

      const groupId = `${groupPrefix}:${index + 1}`

      registrationMarks.push({
        id: `${groupId}:mark`,
        edge,
        x,
        y,
        groupId,
      })
      alignmentGuides.push({
        id: `${groupId}:guide`,
        edge,
        start,
        end,
        groupId,
      })
    }

    const labelPosition = getAssemblyLabelPosition(edge)
    const labelGroupId = `${groupPrefix}:label`
    assemblyLabels.push({
      id: `${labelGroupId}:assembly`,
      edge,
      x: labelPosition.x,
      y: labelPosition.y,
      text: `Join Page ${targetPageNumber}`,
      targetPageNumber,
      groupId: labelGroupId,
    })

    const indicatorPosition = getJoinIndicatorPosition(edge, anchors)
    const indicatorGroupId = `${groupPrefix}:join`
    joinIndicators.push({
      id: `${indicatorGroupId}:indicator`,
      edge,
      x: indicatorPosition.x,
      y: indicatorPosition.y,
      text: joinCode,
      targetPageNumber,
      groupId: indicatorGroupId,
    })
    overlapRegions.push({
      id: `${indicatorGroupId}:overlap`,
      edge,
      bounds: getOverlapBounds(edge),
      targetPageNumber,
      groupId: indicatorGroupId,
    })
  }

  const verticalAnchors = buildEdgeAnchorPositions(printableBounds.minY, printableBounds.maxY)
  const horizontalAnchors = buildEdgeAnchorPositions(printableBounds.minX, printableBounds.maxX)

  if (column > 0) {
    pushEdgeArtifacts('left', verticalAnchors, getTilePageNumber(row, column - 1))
  }

  if (column < columnCount - 1) {
    pushEdgeArtifacts('right', verticalAnchors, getTilePageNumber(row, column + 1))
  }

  if (row > 0) {
    pushEdgeArtifacts('top', horizontalAnchors, getTilePageNumber(row - 1, column))
  }

  if (row < rowCount - 1) {
    pushEdgeArtifacts('bottom', horizontalAnchors, getTilePageNumber(row + 1, column))
  }

  return {
    registrationMarks,
    alignmentGuides,
    assemblyLabels,
    joinIndicators,
    overlapRegions,
  }
}

function chooseBestTilingAttempt(attempts: TilingAttempt[]) {
  return attempts.reduce((best, current) => {
    if (current.pageCount !== best.pageCount) {
      return current.pageCount < best.pageCount ? current : best
    }

    if (current.usedArea !== best.usedArea) {
      return current.usedArea < best.usedArea ? current : best
    }

    if (current.pageRows !== best.pageRows) {
      return current.pageRows < best.pageRows ? current : best
    }

    if (current.pageColumns !== best.pageColumns) {
      return current.pageColumns < best.pageColumns ? current : best
    }

    return best
  })
}

function buildTilingAttempts(
  template: TemplateItem,
  printableArea: PrintableArea,
): TilingAttempt[] {
  const { maxWidth, maxHeight, totalWidth, totalHeight } = getAggregatePartDimensions(template.parts)
  const widthLimits = buildLimitCandidates(totalWidth, printableArea.width, maxWidth)
  const heightLimits = buildLimitCandidates(totalHeight, printableArea.height, maxHeight)
  const partOrderings = sortPartsForLayout(template.parts)
  const attempts: TilingAttempt[] = []

  for (const parts of partOrderings) {
    for (const widthLimit of widthLimits) {
      const attempt = packPartsIntoRows(parts, createVirtualPrintableArea(widthLimit, totalHeight))

      if (attempt.overflowMm === 0) {
        attempts.push(buildTilingAttempt(attempt.placements, printableArea))
      }
    }

    for (const heightLimit of heightLimits) {
      const attempt = packPartsIntoColumns(parts, createVirtualPrintableArea(totalWidth, heightLimit))

      if (attempt.overflowMm === 0) {
        attempts.push(buildTilingAttempt(attempt.placements, printableArea))
      }
    }
  }

  return attempts
}

function createTiledLayoutResult(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  printableArea: PrintableArea,
  tilingAttempt: TilingAttempt,
): LayoutResult {
  const pages: LayoutPage[] = []
  let pageNumber = 1
  const strideX = tilingAttempt.pageColumns === 1 ? printableArea.width : printableArea.width - TILE_OVERLAP_MM
  const strideY = tilingAttempt.pageRows === 1 ? printableArea.height : printableArea.height - TILE_OVERLAP_MM

  for (let row = 0; row < tilingAttempt.pageRows; row += 1) {
    for (let column = 0; column < tilingAttempt.pageColumns; column += 1) {
      const tileMinX = column * strideX
      const tileMinY = row * strideY
      const tileWindow: Bounds = {
        minX: tileMinX,
        minY: tileMinY,
        maxX: tileMinX + printableArea.width,
        maxY: tileMinY + printableArea.height,
        width: printableArea.width,
        height: printableArea.height,
      }
      const partPlacements = tilingAttempt.placements
        .filter((placement) =>
          intersectsBounds(
            {
              minX: placement.offsetX + placement.bounds.minX,
              minY: placement.offsetY + placement.bounds.minY,
              maxX: placement.offsetX + placement.bounds.maxX,
              maxY: placement.offsetY + placement.bounds.maxY,
              width: placement.bounds.width,
              height: placement.bounds.height,
            },
            tileWindow,
          ),
        )
        .map((placement) => ({
          ...placement,
          offsetX: placement.offsetX + printableArea.x - tileMinX,
          offsetY: placement.offsetY + printableArea.y - tileMinY,
        }))

      if (partPlacements.length === 0 && tilingAttempt.placements.length > 0) {
        continue
      }

      const alignmentArtifacts = buildPageAlignmentArtifacts(
        template.id,
        printableArea.bounds,
        row,
        column,
        tilingAttempt.pageRows,
        tilingAttempt.pageColumns,
      )

      pages.push({
        id: `${template.id}:page:${row + 1}:${column + 1}`,
        pageNumber,
        paperSizeId: paper.id,
        orientation,
        tileRow: row + 1,
        tileColumn: column + 1,
        tileRows: tilingAttempt.pageRows,
        tileColumns: tilingAttempt.pageColumns,
        printableBounds: printableArea.bounds,
        partPlacements,
        registrationMarks: alignmentArtifacts.registrationMarks,
        alignmentGuides: alignmentArtifacts.alignmentGuides,
        assemblyLabels: alignmentArtifacts.assemblyLabels,
        joinIndicators: alignmentArtifacts.joinIndicators,
        overlapRegions: alignmentArtifacts.overlapRegions,
      })
      pageNumber += 1
    }
  }

  return {
    pages,
    pageCount: pages.length,
    printableAreaOverflow: false,
    hasLegalPlacement: true,
    printableArea,
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

function layoutTemplateForOrientationWithTiling(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  printableArea: PrintableArea,
): LayoutResult {
  const tilingAttempts = buildTilingAttempts(template, printableArea)

  if (tilingAttempts.length === 0) {
    return createOverflowResult(printableArea)
  }

  return createTiledLayoutResult(
    template,
    paper,
    orientation,
    printableArea,
    chooseBestTilingAttempt(tilingAttempts),
  )
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
    return layoutTemplateForOrientationWithTiling(template, paper, orientation, printableArea)
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

  const tilingAttempts = buildTilingAttempts(template, printableArea)
  if (tilingAttempts.length === 0) {
    const result = createOverflowResult(printableArea)
    const footprint = getTemplateFootprint(template)

    return {
      result,
      overflowMm: placementAttempt.overflowMm,
      aspectDelta:
        footprint.height === 0 ? 0 : Math.abs(footprint.width / footprint.height - printableAspect),
    }
  }

  const tilingAttempt = chooseBestTilingAttempt(tilingAttempts)
  const result = createTiledLayoutResult(template, paper, orientation, printableArea, tilingAttempt)

  return {
    result,
    overflowMm: 0,
    aspectDelta:
      tilingAttempt.usedHeight === 0
        ? 0
        : Math.abs(tilingAttempt.usedWidth / tilingAttempt.usedHeight - printableAspect),
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
