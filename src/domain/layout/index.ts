import type { Bounds, Point } from '../geometry/index.ts'
import {
  type MarginConfig,
  type Orientation,
  type OrientationPreference,
  type PaperDefinition,
  type PrintableArea,
  getPrintableArea,
} from '../paper/index.ts'
import type {
  Annotation,
  CutPath,
  FoldLine,
  JoinEdge,
  Panel,
  SplitCandidate,
  Tab,
  TemplateItem,
  TemplatePart,
  TemplatePartPlacement,
} from '../templates/index.ts'

export interface LayoutStatus {
  type: 'single-piece' | 'multi-piece' | 'overflow'
  description: string
  errorCount: number
  warningCount: number
}

function crossProductSign(a: Point, b: Point, c: Point): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

function splitTemplateAtCandidate(
  template: TemplateItem,
  split: SplitCandidate,
  assemblyAId: string,
  assemblyBId: string,
): TemplateItem | null {
  const splitStart = split.start
  const splitEnd = split.end

  const panelToAssembly = new Map<string, string>()

  for (const panel of template.panels) {
    const cx = (panel.bounds.minX + panel.bounds.maxX) / 2
    const cy = (panel.bounds.minY + panel.bounds.maxY) / 2
    const side = crossProductSign(splitStart, splitEnd, { x: cx, y: cy })
    panelToAssembly.set(panel.id, side >= 0 ? assemblyAId : assemblyBId)
  }

  const aPanels = new Set<string>()
  const bPanels = new Set<string>()
  for (const [pid, aid] of panelToAssembly) {
    if (aid === assemblyAId) aPanels.add(pid)
    else bPanels.add(pid)
  }
  if (aPanels.size === 0 || bPanels.size === 0) return null

  function pointsAssemblyId(points: { x: number; y: number }[]): string | null {
    if (points.length === 0) return null
    const cx = points.reduce((s, p) => s + p.x, 0) / points.length
    const cy = points.reduce((s, p) => s + p.y, 0) / points.length
    const side = crossProductSign(splitStart, splitEnd, { x: cx, y: cy })
    return side >= 0 ? assemblyAId : assemblyBId
  }

  const aTabs: Tab[] = []
  const bTabs: Tab[] = []
  for (const tab of template.tabs) {
    const target = pointsAssemblyId(tab.outline)
    if (target === assemblyAId) aTabs.push(tab)
    else bTabs.push(tab)
  }

  const aCutPaths: CutPath[] = []
  const bCutPaths: CutPath[] = []
  for (const path of template.cutPaths) {
    const target = pointsAssemblyId(path.path)
    if (target === assemblyAId) aCutPaths.push(path)
    else bCutPaths.push(path)
  }

  const aFoldLines: FoldLine[] = []
  const bFoldLines: FoldLine[] = []
  let joinEdgeA: JoinEdge | null = null
  let joinEdgeB: JoinEdge | null = null
  for (const line of template.foldLines) {
    const midX = (line.start.x + line.end.x) / 2
    const midY = (line.start.y + line.end.y) / 2
    const side = crossProductSign(splitStart, splitEnd, { x: midX, y: midY })
    if (Math.abs(side) < 0.01) {
      const refX = (line.start.x + line.end.x + splitStart.x + splitEnd.x) / 4
      const refY = (line.start.y + line.end.y + splitStart.y + splitEnd.y) / 4
      const edgeSide = crossProductSign(splitStart, splitEnd, { x: refX, y: refY })
      if (edgeSide >= 0) {
        aFoldLines.push(line)
        joinEdgeA = {
          id: `${assemblyAId}:join:split`,
          partId: assemblyAId,
          start: line.start,
          end: line.end,
          label: 'Join to Assembly B',
          partnerId: assemblyBId,
        }
        joinEdgeB = {
          id: `${assemblyBId}:join:split`,
          partId: assemblyBId,
          start: line.start,
          end: line.end,
          label: 'Join to Assembly A',
          partnerId: assemblyAId,
        }
      } else {
        bFoldLines.push(line)
        joinEdgeA = {
          id: `${assemblyAId}:join:split`,
          partId: assemblyAId,
          start: line.start,
          end: line.end,
          label: 'Join to Assembly B',
          partnerId: assemblyBId,
        }
        joinEdgeB = {
          id: `${assemblyBId}:join:split`,
          partId: assemblyBId,
          start: line.start,
          end: line.end,
          label: 'Join to Assembly A',
          partnerId: assemblyAId,
        }
      }
    } else if (side > 0) {
      aFoldLines.push(line)
    } else {
      bFoldLines.push(line)
    }
  }

  function buildPartBounds(
    panels: TemplateItem['panels'],
    cutPaths: TemplateItem['cutPaths'],
    tabs: TemplateItem['tabs'],
  ): Bounds {
    const allPoints: { x: number; y: number }[] = []
    for (const p of panels) allPoints.push(...p.outline)
    for (const p of cutPaths) allPoints.push(...p.path)
    for (const t of tabs) allPoints.push(...t.outline)
    if (allPoints.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
  }

  const aPanelsList: Panel[] = []
  const bPanelsList: Panel[] = []
  for (const panel of template.panels) {
    const target = panelToAssembly.get(panel.id) ?? assemblyAId
    if (target === assemblyAId) aPanelsList.push(panel)
    else bPanelsList.push(panel)
  }

  const aPartBounds = buildPartBounds(aPanelsList, aCutPaths, aTabs)
  const bPartBounds = buildPartBounds(bPanelsList, bCutPaths, bTabs)

  const joinEdges: JoinEdge[] = []
  if (joinEdgeA && joinEdgeB) {
    joinEdges.push(joinEdgeA, joinEdgeB)
  }

  const aPart: TemplatePart = {
    id: assemblyAId,
    name: 'Assembly A',
    panelIds: aPanelsList.map((p) => p.id),
    cutPathIds: aCutPaths.map((p) => p.id),
    foldLineIds: aFoldLines.map((p) => p.id),
    tabIds: aTabs.map((p) => p.id),
    joinEdgeIds: joinEdgeA ? [joinEdgeA.id] : [],
    bounds: aPartBounds,
  }
  const bPart: TemplatePart = {
    id: assemblyBId,
    name: 'Assembly B',
    panelIds: bPanelsList.map((p) => p.id),
    cutPathIds: bCutPaths.map((p) => p.id),
    foldLineIds: bFoldLines.map((p) => p.id),
    tabIds: bTabs.map((p) => p.id),
    joinEdgeIds: joinEdgeB ? [joinEdgeB.id] : [],
    bounds: bPartBounds,
  }

  const result: TemplateItem = {
    id: template.id,
    version: template.version,
    name: template.name,
    shapeType: template.shapeType,
    dimensionsMm: { ...template.dimensionsMm },
    parts: [aPart, bPart],
    panels: template.panels,
    cutPaths: template.cutPaths,
    foldLines: template.foldLines,
    tabs: template.tabs,
    joinEdges: [...template.joinEdges, ...joinEdges],
    annotations: template.annotations,
    splitCandidates: template.splitCandidates,
    assemblyNotes: template.assemblyNotes,
    pages: [],
    metadata: { ...template.metadata, multiPieceSplit: true },
  }

  if (joinEdgeA && joinEdgeB) {
    const glueTabWidth = (template.dimensionsMm['glueTabWidth'] ?? 10) as number
    if (glueTabWidth > 0) {
      const joinFoldLine = template.foldLines.find((line) => {
        const mx = (line.start.x + line.end.x) / 2
        const my = (line.start.y + line.end.y) / 2
        return Math.abs(crossProductSign(splitStart, splitEnd, { x: mx, y: my })) < 0.01
      })

      if (joinFoldLine) {
        const aPanel = template.panels.find((p) => aPanels.has(p.id))
        if (aPanel) {
          const panelCx = (aPanel.bounds.minX + aPanel.bounds.maxX) / 2
          const panelCy = (aPanel.bounds.minY + aPanel.bounds.maxY) / 2
          const fx = (joinFoldLine.start.x + joinFoldLine.end.x) / 2
          const fy = (joinFoldLine.start.y + joinFoldLine.end.y) / 2
          const toPanelX = panelCx - fx
          const toPanelY = panelCy - fy

          const edgeDx = joinFoldLine.end.x - joinFoldLine.start.x
          const edgeDy = joinFoldLine.end.y - joinFoldLine.start.y
          const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy)

          if (edgeLen > 0.001) {
            const lx = -edgeDy; const ly = edgeDx
            const rx = edgeDy; const ry = -edgeDx
            const lenL = Math.sqrt(lx * lx + ly * ly)
            const lenR = Math.sqrt(rx * rx + ry * ry)

            const dotL = (lx / lenL) * toPanelX + (ly / lenL) * toPanelY
            const outX = dotL > 0 ? rx / lenR : lx / lenL
            const outY = dotL > 0 ? ry / lenR : ly / lenL

            const tabId = `join-tab:${assemblyAId}:0`
            const cutId = `join-tab-cut:${assemblyAId}:0`
            const foldId = `join-tab-fold:${assemblyAId}:0`
            const labelId = `join-tab-label:${assemblyAId}:0`
            const receiveId = `join-receive-label:${assemblyBId}:0`

            const s = joinFoldLine.start
            const e = joinFoldLine.end
            const tabPolygon: Point[] = [
              { x: s.x, y: s.y },
              { x: e.x, y: e.y },
              { x: e.x + outX * glueTabWidth, y: e.y + outY * glueTabWidth },
              { x: s.x + outX * glueTabWidth, y: s.y + outY * glueTabWidth },
            ]

            const newTab: Tab = {
              id: tabId,
              partId: assemblyAId,
              outline: tabPolygon,
              attachStart: { x: s.x, y: s.y },
              attachEnd: { x: e.x, y: e.y },
              widthMm: glueTabWidth,
              label: 'Glue Tab — Join to Assembly B',
            }

            const newCutPath: CutPath = {
              id: cutId,
              partId: assemblyAId,
              path: tabPolygon,
              style: 'solid',
              closed: true,
            }

            const newFoldLine: FoldLine = {
              id: foldId,
              partId: assemblyAId,
              start: { x: s.x, y: s.y },
              end: { x: e.x, y: e.y },
              foldType: 'valley',
              style: 'dashed',
            }

            const tabCx = tabPolygon.reduce((sum, p) => sum + p.x, 0) / tabPolygon.length
            const tabCy = tabPolygon.reduce((sum, p) => sum + p.y, 0) / tabPolygon.length

            const newAnnotations: Annotation[] = [
              {
                id: labelId,
                kind: 'label',
                text: 'Glue Tab — Join to Assembly B',
                position: { x: tabCx, y: tabCy },
                targetIds: [tabId],
              },
              {
                id: receiveId,
                kind: 'instruction',
                text: 'Attach Assembly A tab here',
                position: { x: fx + outX * 3, y: fy + outY * 3 },
                targetIds: [joinEdgeB.id],
              },
            ]

            result.tabs = [...result.tabs, newTab]
            result.cutPaths = [...result.cutPaths, newCutPath]
            result.foldLines = [...result.foldLines, newFoldLine]
            result.annotations = [...result.annotations, ...newAnnotations]
            result.parts[0]!.tabIds = [...result.parts[0]!.tabIds, tabId]
            result.parts[0]!.cutPathIds = [...result.parts[0]!.cutPathIds, cutId]
            result.parts[0]!.foldLineIds = [...result.parts[0]!.foldLineIds, foldId]

            const allPoints: { x: number; y: number }[] = []
            for (const p of aPanelsList) allPoints.push(...p.outline)
            for (const p of aCutPaths) allPoints.push(...p.path)
            for (const t of aTabs) allPoints.push(...t.outline)
            allPoints.push(...tabPolygon)
            allPoints.push(s, e)
            let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
            for (const p of allPoints) {
              if (p.x < mnX) mnX = p.x
              if (p.y < mnY) mnY = p.y
              if (p.x > mxX) mxX = p.x
              if (p.y > mxY) mxY = p.y
            }
            result.parts[0]!.bounds = { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY, width: mxX - mnX, height: mxY - mnY }
          }
        }
      }
    }
  }

  return result
}

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

export type LayoutType = 'single-piece' | 'multi-piece' | 'overflow'

export interface LayoutResult {
  pages: LayoutPage[]
  pageCount: number
  printableAreaOverflow: boolean
  hasLegalPlacement: boolean
  printableArea: PrintableArea
  layoutType: LayoutType
  assemblyCount: number
  splitTemplate?: TemplateItem
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
    layoutType: 'overflow',
    assemblyCount: 0,
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
  layoutType: LayoutType = 'single-piece',
  assemblyCount: number = 1,
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
    layoutType,
    assemblyCount,
  }
}

function moveJoinTabToAssembly(
  template: TemplateItem,
  fromPartId: string,
  toPartId: string,
): TemplateItem {
  const tab = template.tabs.find((t) => t.id.startsWith(`join-tab:${fromPartId}:`))
  if (!tab) return template

  const cutPath = template.cutPaths.find((c) => c.id.startsWith(`join-tab-cut:${fromPartId}:`))
  const foldLine = template.foldLines.find((f) => f.id.startsWith(`join-tab-fold:${fromPartId}:`))
  const tabLabel = template.annotations.find((a) => a.id.startsWith(`join-tab-label:${fromPartId}:`))
  const receiveLabel = template.annotations.find((a) => a.id.startsWith(`join-receive-label:`))

  const fromPart = template.parts.find((p) => p.id === fromPartId)
  const toPart = template.parts.find((p) => p.id === toPartId)
  if (!fromPart || !toPart) return template

  tab.partId = toPartId
  if (cutPath) cutPath.partId = toPartId
  if (foldLine) foldLine.partId = toPartId

  fromPart.tabIds = fromPart.tabIds.filter((id) => id !== tab.id)
  fromPart.cutPathIds = fromPart.cutPathIds.filter((id) => id !== cutPath?.id)
  fromPart.foldLineIds = fromPart.foldLineIds.filter((id) => id !== foldLine?.id)
  toPart.tabIds = [...toPart.tabIds, tab.id]
  if (cutPath) toPart.cutPathIds = [...toPart.cutPathIds, cutPath.id]
  if (foldLine) toPart.foldLineIds = [...toPart.foldLineIds, foldLine.id]

  const fromName = fromPart.name
  const toName = toPart.name
  const joinEdgeA = template.joinEdges.find((e) => e.partId === fromPartId)

  tab.label = `Glue Tab — Join to ${fromName}`
  if (tabLabel) {
    tabLabel.text = `Glue Tab — Join to ${fromName}`
  }
  if (receiveLabel) {
    receiveLabel.text = `Attach ${toName} tab here`
    receiveLabel.targetIds = joinEdgeA ? [joinEdgeA.id] : []
  }

  const fromAllPoints: { x: number; y: number }[] = []
  for (const pid of fromPart.panelIds) {
    const panel = template.panels.find((p) => p.id === pid)
    if (panel) fromAllPoints.push(...panel.outline)
  }
  for (const pid of fromPart.cutPathIds) {
    const cp = template.cutPaths.find((c) => c.id === pid)
    if (cp) fromAllPoints.push(...cp.path)
  }
  for (const tid of fromPart.tabIds) {
    const tb = template.tabs.find((t) => t.id === tid)
    if (tb) fromAllPoints.push(...tb.outline)
  }
  if (fromAllPoints.length > 0) {
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
    for (const p of fromAllPoints) {
      if (p.x < mnX) mnX = p.x; if (p.y < mnY) mnY = p.y
      if (p.x > mxX) mxX = p.x; if (p.y > mxY) mxY = p.y
    }
    fromPart.bounds = { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY, width: mxX - mnX, height: mxY - mnY }
  }

  const toAllPoints: { x: number; y: number }[] = []
  for (const pid of toPart.panelIds) {
    const panel = template.panels.find((p) => p.id === pid)
    if (panel) toAllPoints.push(...panel.outline)
  }
  for (const pid of toPart.cutPathIds) {
    const cp = template.cutPaths.find((c) => c.id === pid)
    if (cp) toAllPoints.push(...cp.path)
  }
  for (const tid of toPart.tabIds) {
    const tb = template.tabs.find((t) => t.id === tid)
    if (tb) toAllPoints.push(...tb.outline)
  }
  if (toAllPoints.length > 0) {
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
    for (const p of toAllPoints) {
      if (p.x < mnX) mnX = p.x; if (p.y < mnY) mnY = p.y
      if (p.x > mxX) mxX = p.x; if (p.y > mxY) mxY = p.y
    }
    toPart.bounds = { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY, width: mxX - mnX, height: mxY - mnY }
  }

  return template
}

function tryMultiPieceLayout(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): LayoutResult | null {
  const printableArea = getPrintableArea(paper, orientation, margins)
  const candidateCount = Math.min(template.splitCandidates.length, 6)

  for (let i = 0; i < candidateCount; i++) {
    const split = template.splitCandidates[i]!
    const assemblyAId = `${template.id}:assembly:a`
    const assemblyBId = `${template.id}:assembly:b`
    let splitTemplate = splitTemplateAtCandidate(template, split, assemblyAId, assemblyBId)
    if (!splitTemplate) continue

    const aCheck = optimizePartPlacements(
      { ...splitTemplate, parts: [splitTemplate.parts[0]!] },
      printableArea,
    )
    if (aCheck.overflowMm > 0) {
      splitTemplate = moveJoinTabToAssembly(splitTemplate, assemblyAId, assemblyBId)
    }

    const placementAttempt = optimizePartPlacements(splitTemplate, printableArea)

    if (placementAttempt.overflowMm === 0) {
      const pages: LayoutPage[] = []
      const aParts = placementAttempt.placements.filter((p) => p.partId === assemblyAId)
      const bParts = placementAttempt.placements.filter((p) => p.partId === assemblyBId)

      pages.push({
        id: `${template.id}:page:1`,
        pageNumber: 1,
        paperSizeId: paper.id,
        orientation,
        tileRow: 1,
        tileColumn: 1,
        tileRows: 1,
        tileColumns: 1,
        printableBounds: printableArea.bounds,
        partPlacements: [...aParts, ...bParts],
        registrationMarks: [],
        alignmentGuides: [],
        assemblyLabels: [
          { id: `${template.id}:label:a`, edge: 'top', x: 0, y: 0, text: 'Assembly A', targetPageNumber: 1, groupId: 'main' },
          { id: `${template.id}:label:b`, edge: 'top', x: 0, y: 0, text: 'Assembly B', targetPageNumber: 1, groupId: 'main' },
        ],
        joinIndicators: [
          { id: `${template.id}:join:indicator`, edge: 'top', x: 0, y: 0, text: '<- Join ->', targetPageNumber: 1, groupId: 'main' },
        ],
        overlapRegions: [],
      })

      return {
        pages,
        pageCount: 1,
        printableAreaOverflow: false,
        hasLegalPlacement: true,
        printableArea,
        layoutType: 'multi-piece',
        assemblyCount: 2,
        splitTemplate,
      }
    }

    const aFit = optimizePartPlacements(
      { ...splitTemplate, parts: [splitTemplate.parts[0]!] },
      printableArea,
    )
    const bFit = optimizePartPlacements(
      { ...splitTemplate, parts: [splitTemplate.parts[1]!] },
      printableArea,
    )

    if (aFit.overflowMm === 0 && bFit.overflowMm === 0) {
      const pages: LayoutPage[] = []

      pages.push({
        id: `${template.id}:page:1`,
        pageNumber: 1,
        paperSizeId: paper.id,
        orientation,
        tileRow: 1,
        tileColumn: 1,
        tileRows: 1,
        tileColumns: 2,
        printableBounds: printableArea.bounds,
        partPlacements: aFit.placements,
        registrationMarks: [],
        alignmentGuides: [],
        assemblyLabels: [
          { id: `${template.id}:label:a`, edge: 'top', x: 0, y: 0, text: 'Assembly A — Front + Top + Bottom', targetPageNumber: 1, groupId: 'main' },
        ],
        joinIndicators: [
          { id: `${template.id}:join:a`, edge: 'right', x: 0, y: 0, text: 'Join to Assembly B ->', targetPageNumber: 2, groupId: 'main' },
        ],
        overlapRegions: [],
      })

      pages.push({
        id: `${template.id}:page:2`,
        pageNumber: 2,
        paperSizeId: paper.id,
        orientation,
        tileRow: 1,
        tileColumn: 2,
        tileRows: 1,
        tileColumns: 2,
        printableBounds: printableArea.bounds,
        partPlacements: bFit.placements,
        registrationMarks: [],
        alignmentGuides: [],
        assemblyLabels: [
          { id: `${template.id}:label:b`, edge: 'top', x: 0, y: 0, text: 'Assembly B — Back + Left + Right', targetPageNumber: 2, groupId: 'main' },
        ],
        joinIndicators: [
          { id: `${template.id}:join:b`, edge: 'left', x: 0, y: 0, text: '<- Join to Assembly A', targetPageNumber: 1, groupId: 'main' },
        ],
        overlapRegions: [],
      })

      return {
        pages,
        pageCount: 2,
        printableAreaOverflow: false,
        hasLegalPlacement: true,
        printableArea,
        layoutType: 'multi-piece',
        assemblyCount: 2,
        splitTemplate,
      }
    }
  }

  return null
}

function layoutTemplateForOrientation(
  template: TemplateItem,
  paper: PaperDefinition,
  orientation: Orientation,
  margins: MarginConfig,
): LayoutResult {
  const printableArea = getPrintableArea(paper, orientation, margins)
  const placementAttempt = optimizePartPlacements(template, printableArea)

  if (placementAttempt.overflowMm === 0) {
    return createPlacedLayoutResult(
      template,
      paper,
      orientation,
      printableArea,
      placementAttempt.placements,
    )
  }

  const multiPiece = tryMultiPieceLayout(template, paper, orientation, margins)
  if (multiPiece) return multiPiece

  return createOverflowResult(printableArea)
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

  const multiPiece = tryMultiPieceLayout(template, paper, orientation, margins)
  if (multiPiece) {
    return {
      result: multiPiece,
      overflowMm: 0,
      aspectDelta: 0,
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
