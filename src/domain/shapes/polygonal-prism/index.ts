import { getBounds, type Point } from '../../geometry/index.ts'
import type {
  Annotation,
  CutPath,
  FoldLine,
  JoinEdge,
  Panel,
  Tab,
  TemplatePart,
} from '../../templates/index.ts'
import {
  createEntityId,
  getOutlineBounds,
  getRectangleCenter,
  type ShapeGenerationContext,
  type ShapeGenerationResult,
} from '../shared/index.ts'

export interface PolygonalPrismInput {
  sideCount: number
  sideLengthMm: number
  heightMm: number
}

const CAP_GAP_MM = 12
const MINIMUM_SIDE_COUNT = 3

function roundMm(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function createPanelAnnotation(
  context: ShapeGenerationContext,
  panel: Panel,
  text: string,
): Annotation {
  return {
    id: createEntityId(context, 'annotation', panel.id),
    kind: 'label',
    text,
    position: getRectangleCenter(panel.outline),
    targetIds: [panel.id],
  }
}

function createRegistrationAnnotation(
  context: ShapeGenerationContext,
  id: string,
  text: string,
  position: Point,
  targetId: string,
): Annotation {
  return {
    id: createEntityId(context, 'annotation', id),
    kind: 'registration',
    text,
    position,
    targetIds: [targetId],
  }
}

function createHorizontalTab(
  xStart: number,
  xEnd: number,
  yAttach: number,
  depth: number,
  direction: 'up' | 'down',
): Point[] {
  const offset = direction === 'up' ? -depth : depth
  const inset = Math.min(depth * 0.24, Math.max(2, (xEnd - xStart) * 0.18))

  return [
    { x: roundMm(xStart), y: roundMm(yAttach) },
    { x: roundMm(xStart + inset), y: roundMm(yAttach + offset) },
    { x: roundMm(xEnd - inset), y: roundMm(yAttach + offset) },
    { x: roundMm(xEnd), y: roundMm(yAttach) },
  ]
}

function createVerticalGlueTab(
  x: number,
  yTop: number,
  yBottom: number,
  glueTabWidthMm: number,
): Point[] {
  const wallHeight = yBottom - yTop
  const inset = Math.min(glueTabWidthMm * 0.45, Math.max(4, wallHeight * 0.2))

  return [
    { x, y: roundMm(yTop) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yTop + inset) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yBottom - inset) },
    { x, y: roundMm(yBottom) },
  ]
}

function createTab(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  label: string,
  outline: Point[],
): Tab {
  const bounds = getBounds(outline)

  return {
    id: createEntityId(context, 'tab', id),
    partId,
    outline,
    attachStart: outline[0]!,
    attachEnd: outline.at(-1)!,
    widthMm: Math.min(bounds.width, bounds.height),
    label,
  }
}

function createCutPath(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  path: Point[],
  closed: boolean,
): CutPath {
  return {
    id: createEntityId(context, 'cut', id),
    partId,
    path,
    style: 'solid',
    closed,
  }
}

function createFoldLine(
  context: ShapeGenerationContext,
  partId: string,
  id: string,
  start: Point,
  end: Point,
): FoldLine {
  return {
    id: createEntityId(context, 'fold', id),
    partId,
    start,
    end,
    foldType: 'score',
    style: 'dashed',
  }
}

function createRegularPolygon(centerX: number, centerY: number, radius: number, sideCount: number) {
  return Array.from({ length: sideCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / sideCount) * Math.PI * 2

    return {
      x: roundMm(centerX + Math.cos(angle) * radius),
      y: roundMm(centerY + Math.sin(angle) * radius),
    }
  })
}

export function generatePolygonalPrismTemplate(
  input: PolygonalPrismInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  if (input.sideCount < MINIMUM_SIDE_COUNT) {
    throw new Error(`Polygonal prisms require at least ${MINIMUM_SIDE_COUNT} sides.`)
  }

  const partId = createEntityId(context, 'part', 'main')
  const apothem = input.sideLengthMm / (2 * Math.tan(Math.PI / input.sideCount))
  const circumradius = input.sideLengthMm / (2 * Math.sin(Math.PI / input.sideCount))
  const capTabDepthMm = roundMm(
    Math.min(Math.max(input.sideLengthMm * 0.42, 10), Math.max(10, apothem * 0.82)),
  )
  const glueTabWidthMm = roundMm(Math.min(Math.max(input.sideLengthMm * 0.28, 10), 18))
  const stripY = capTabDepthMm
  const stripBottom = stripY + input.heightMm
  const totalWidth = input.sideCount * input.sideLengthMm

  let cursorX = 0
  const panels: Panel[] = Array.from({ length: input.sideCount }, (_, index) => {
    const outline = [
      { x: roundMm(cursorX), y: roundMm(stripY) },
      { x: roundMm(cursorX + input.sideLengthMm), y: roundMm(stripY) },
      { x: roundMm(cursorX + input.sideLengthMm), y: roundMm(stripBottom) },
      { x: roundMm(cursorX), y: roundMm(stripBottom) },
    ]
    const panel: Panel = {
      id: createEntityId(context, 'panel', `face-${index + 1}`),
      partId,
      name: `Face ${index + 1}`,
      outline,
      bounds: getBounds(outline),
    }

    cursorX += input.sideLengthMm
    return panel
  })

  const tabs: Tab[] = [
    createTab(
      context,
      partId,
      'glue-seam',
      'Glue Seam',
      createVerticalGlueTab(totalWidth, stripY, stripBottom, glueTabWidthMm),
    ),
    ...panels.flatMap((panel, index) => [
      createTab(
        context,
        partId,
        `top-face-${index + 1}`,
        `Top Face ${index + 1} Tab`,
        createHorizontalTab(panel.bounds.minX, panel.bounds.maxX, stripY, capTabDepthMm, 'up'),
      ),
      createTab(
        context,
        partId,
        `bottom-face-${index + 1}`,
        `Bottom Face ${index + 1} Tab`,
        createHorizontalTab(panel.bounds.minX, panel.bounds.maxX, stripBottom, capTabDepthMm, 'down'),
      ),
    ]),
  ]

  const cutPaths: CutPath[] = [
    createCutPath(
      context,
      partId,
      'left-edge',
      [
        { x: roundMm(0), y: roundMm(stripY) },
        { x: roundMm(0), y: roundMm(stripBottom) },
      ],
      false,
    ),
    ...tabs.map((tab) => createCutPath(context, partId, tab.id, tab.outline, false)),
  ]

  const foldLines: FoldLine[] = [
    ...panels.slice(0, -1).map((panel, index) =>
      createFoldLine(
        context,
        partId,
        `side-face-${index + 1}`,
        { x: roundMm(panel.bounds.maxX), y: roundMm(stripY) },
        { x: roundMm(panel.bounds.maxX), y: roundMm(stripBottom) },
      ),
    ),
    createFoldLine(
      context,
      partId,
      'glue-seam',
      { x: roundMm(totalWidth), y: roundMm(stripY) },
      { x: roundMm(totalWidth), y: roundMm(stripBottom) },
    ),
    ...tabs.slice(1).map((tab) =>
      createFoldLine(context, partId, `tab-${tab.id}`, tab.attachStart, tab.attachEnd),
    ),
  ]

  const seamStartId = createEntityId(context, 'join-edge', 'seam-a-start')
  const seamEndId = createEntityId(context, 'join-edge', 'seam-a-end')
  const joinEdges: JoinEdge[] = [
    {
      id: seamStartId,
      partId,
      start: { x: roundMm(0), y: roundMm(stripY) },
      end: { x: roundMm(0), y: roundMm(stripBottom) },
      label: 'Seam A',
      partnerId: seamEndId,
    },
    {
      id: seamEndId,
      partId,
      start: { x: roundMm(totalWidth), y: roundMm(stripY) },
      end: { x: roundMm(totalWidth), y: roundMm(stripBottom) },
      label: 'Seam A',
      partnerId: seamStartId,
    },
  ]

  const capRowY = stripBottom + capTabDepthMm + CAP_GAP_MM + circumradius
  const baseCapCenterX = circumradius + 12
  const topCapCenterX = baseCapCenterX + circumradius * 2 + CAP_GAP_MM
  const baseCapOutline = createRegularPolygon(baseCapCenterX, capRowY, circumradius, input.sideCount)
  const topCapOutline = createRegularPolygon(topCapCenterX, capRowY, circumradius, input.sideCount)
  const baseCapPanel: Panel = {
    id: createEntityId(context, 'panel', 'base-cap'),
    partId,
    name: 'Base Cap',
    outline: baseCapOutline,
    bounds: getBounds(baseCapOutline),
  }
  const topCapPanel: Panel = {
    id: createEntityId(context, 'panel', 'top-cap'),
    partId,
    name: 'Top Cap',
    outline: topCapOutline,
    bounds: getBounds(topCapOutline),
  }
  panels.push(baseCapPanel, topCapPanel)
  cutPaths.push(
    createCutPath(context, partId, 'base-cap', baseCapOutline, true),
    createCutPath(context, partId, 'top-cap', topCapOutline, true),
  )

  const annotations: Annotation[] = [
    ...panels.map((panel) => createPanelAnnotation(context, panel, panel.name)),
    createRegistrationAnnotation(
      context,
      'seam-start',
      'Seam A',
      { x: roundMm(10), y: roundMm((stripY + stripBottom) / 2) },
      seamStartId,
    ),
    createRegistrationAnnotation(
      context,
      'seam-end',
      'Seam A',
      { x: roundMm(totalWidth - 10), y: roundMm((stripY + stripBottom) / 2) },
      seamEndId,
    ),
  ]

  const partBounds = getOutlineBounds([
    ...panels.map((panel) => panel.outline),
    ...tabs.map((tab) => tab.outline),
  ])
  const part: TemplatePart = {
    id: partId,
    name: `${input.sideCount}-Sided Prism`,
    panelIds: panels.map((panel) => panel.id),
    cutPathIds: cutPaths.map((path) => path.id),
    foldLineIds: foldLines.map((line) => line.id),
    tabIds: tabs.map((tab) => tab.id),
    joinEdgeIds: joinEdges.map((edge) => edge.id),
    bounds: partBounds,
  }

  return {
    template: {
      id: context.itemId,
      version: 1,
      name: context.itemName,
      shapeType: 'polygonal-prism',
      dimensionsMm: {
        sideCount: input.sideCount,
        sideLength: input.sideLengthMm,
        height: input.heightMm,
        circumradius,
      },
      parts: [part],
      panels,
      cutPaths,
      foldLines,
      tabs,
      joinEdges,
      annotations,
      splitCandidates: foldLines.map((line, index) => ({
        id: createEntityId(context, 'split', `fold-${index + 1}`),
        partId,
        start: line.start,
        end: line.end,
        kind: 'fold',
        priority: index + 1,
        reason:
          line.id.includes('glue-seam')
            ? 'Primary seam fold for the polygonal prism body wrap'
            : line.id.includes('tab-')
              ? 'Cap attachment fold for the polygonal prism tabs'
              : 'Primary side fold between prism faces',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-body'),
          text: 'Pre-crease the side folds, wrap the strip into a ring, and secure the Glue Seam so the polygonal shell holds its profile.',
          step: 1,
        },
        {
          id: createEntityId(context, 'note', 'attach-caps'),
          text: 'Fold the top and bottom face tabs inward, then attach the matching polygon caps to finish the prism.',
          step: 2,
        },
      ],
      pages: [],
      metadata: {
        profile: 'polygonal-prism',
        sideCount: input.sideCount,
        glueTabWidth: glueTabWidthMm,
        capTabDepth: capTabDepthMm,
        queueStatus: 'draft',
      },
    },
  }
}
