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

export interface CustomParametricPanelInput {
  name: string
  widthMm: number
}

export interface CustomParametricShapeInput {
  partName: string
  panelHeightMm: number
  panels: CustomParametricPanelInput[]
  glueTabWidthMm: number
  topTabDepthMm?: number
  bottomTabDepthMm?: number
}

const MINIMUM_PANEL_COUNT = 2

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

function createVerticalGlueTab(x: number, yTop: number, yBottom: number, glueTabWidthMm: number): Point[] {
  const wallHeight = yBottom - yTop
  const inset = Math.min(glueTabWidthMm * 0.45, Math.max(4, wallHeight * 0.2))

  return [
    { x, y: roundMm(yTop) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yTop + inset) },
    { x: roundMm(x + glueTabWidthMm), y: roundMm(yBottom - inset) },
    { x, y: roundMm(yBottom) },
  ]
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

export function generateCustomParametricShapeTemplate(
  input: CustomParametricShapeInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  if (input.panels.length < MINIMUM_PANEL_COUNT) {
    throw new Error(`Custom parametric shapes require at least ${MINIMUM_PANEL_COUNT} panels.`)
  }

  const partId = createEntityId(context, 'part', 'main')
  const topTabDepthMm = roundMm(input.topTabDepthMm ?? 0)
  const bottomTabDepthMm = roundMm(input.bottomTabDepthMm ?? 0)
  const stripY = topTabDepthMm
  const stripBottom = stripY + input.panelHeightMm
  let cursorX = 0
  const panels: Panel[] = input.panels.map((panel, index) => {
    const outline = [
      { x: roundMm(cursorX), y: roundMm(stripY) },
      { x: roundMm(cursorX + panel.widthMm), y: roundMm(stripY) },
      { x: roundMm(cursorX + panel.widthMm), y: roundMm(stripBottom) },
      { x: roundMm(cursorX), y: roundMm(stripBottom) },
    ]
    const result: Panel = {
      id: createEntityId(context, 'panel', `face-${index + 1}`),
      partId,
      name: panel.name,
      outline,
      bounds: getBounds(outline),
    }

    cursorX += panel.widthMm
    return result
  })
  const totalWidth = roundMm(cursorX)

  const tabs: Tab[] = [
    createTab(
      context,
      partId,
      'glue-seam',
      'Glue Seam',
      createVerticalGlueTab(totalWidth, stripY, stripBottom, input.glueTabWidthMm),
    ),
    ...panels.flatMap((panel, index) => {
      const panelTabs: Tab[] = []

      if (topTabDepthMm > 0) {
        panelTabs.push(
          createTab(
            context,
            partId,
            `top-panel-${index + 1}`,
            `Top ${panel.name} Tab`,
            createHorizontalTab(panel.bounds.minX, panel.bounds.maxX, stripY, topTabDepthMm, 'up'),
          ),
        )
      }

      if (bottomTabDepthMm > 0) {
        panelTabs.push(
          createTab(
            context,
            partId,
            `bottom-panel-${index + 1}`,
            `Bottom ${panel.name} Tab`,
            createHorizontalTab(panel.bounds.minX, panel.bounds.maxX, stripBottom, bottomTabDepthMm, 'down'),
          ),
        )
      }

      return panelTabs
    }),
  ]

  const cutPaths: CutPath[] = [
    createCutPath(
      context,
      partId,
      'left-edge',
      [
        { x: 0, y: roundMm(stripY) },
        { x: 0, y: roundMm(stripBottom) },
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
        `panel-${index + 1}`,
        { x: roundMm(panel.bounds.maxX), y: roundMm(stripY) },
        { x: roundMm(panel.bounds.maxX), y: roundMm(stripBottom) },
      ),
    ),
    createFoldLine(
      context,
      partId,
      'glue-seam',
      { x: totalWidth, y: roundMm(stripY) },
      { x: totalWidth, y: roundMm(stripBottom) },
    ),
    ...tabs.slice(1).map((tab) =>
      createFoldLine(context, partId, `tab-${tab.id}`, tab.attachStart, tab.attachEnd),
    ),
  ]

  const joinEdges: JoinEdge[] = [
    {
      id: createEntityId(context, 'join-edge', 'custom-a-start'),
      partId,
      start: { x: 0, y: roundMm(stripY) },
      end: { x: 0, y: roundMm(stripBottom) },
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'custom-a-end'),
    },
    {
      id: createEntityId(context, 'join-edge', 'custom-a-end'),
      partId,
      start: { x: totalWidth, y: roundMm(stripY) },
      end: { x: totalWidth, y: roundMm(stripBottom) },
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'custom-a-start'),
    },
  ]

  const annotations: Annotation[] = [
    ...panels.map((panel) => createPanelAnnotation(context, panel, panel.name)),
    createRegistrationAnnotation(
      context,
      'custom-start',
      'Seam A',
      { x: 8, y: roundMm((stripY + stripBottom) / 2) },
      joinEdges[0]!.id,
    ),
    createRegistrationAnnotation(
      context,
      'custom-end',
      'Seam A',
      { x: roundMm(totalWidth - 8), y: roundMm((stripY + stripBottom) / 2) },
      joinEdges[1]!.id,
    ),
  ]

  const partBounds = getOutlineBounds([
    ...panels.map((panel) => panel.outline),
    ...tabs.map((tab) => tab.outline),
  ])
  const part: TemplatePart = {
    id: partId,
    name: input.partName,
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
      shapeType: 'custom-parametric',
      dimensionsMm: {
        panelHeight: input.panelHeightMm,
        glueTabWidth: input.glueTabWidthMm,
        topTabDepth: topTabDepthMm,
        bottomTabDepth: bottomTabDepthMm,
        totalWidth,
        panelCount: input.panels.length,
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
            ? 'Primary seam fold for the custom parametric strip'
            : line.id.includes('tab-')
              ? 'Custom tab fold for the configured panel edge'
              : 'Primary fold between adjacent configured panels',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-body'),
          text: 'Pre-crease the panel transitions, fold any configured top or bottom tabs, and secure the Glue Seam to complete the custom parametric strip shape.',
          step: 1,
        },
      ],
      pages: [],
      metadata: {
        profile: 'custom-parametric',
        queueStatus: 'draft',
      },
    },
  }
}
