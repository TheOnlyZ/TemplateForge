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
  createRectangle,
  getOutlineBounds,
  getRectangleCenter,
  type ShapeGenerationContext,
  type ShapeGenerationResult,
} from '../shared/index.ts'

export interface CylinderInput {
  diameterMm: number
  heightMm: number
}

const CAP_GAP_MM = 12
const CAP_SEGMENT_COUNT = 32
const MIN_ALIGNMENT_TAB_COUNT = 2
const MAX_ALIGNMENT_TAB_COUNT = 8
const MAX_ALIGNMENT_TAB_WIDTH_MM = 24

function roundMm(value: number) {
  return Math.round(value * 1_000) / 1_000
}

function createCircle(centerX: number, centerY: number, radius: number, segmentCount: number): Point[] {
  return Array.from({ length: segmentCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / segmentCount) * Math.PI * 2

    return {
      x: roundMm(centerX + Math.cos(angle) * radius),
      y: roundMm(centerY + Math.sin(angle) * radius),
    }
  })
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

function createVerticalGlueTab(
  x: number,
  yTop: number,
  yBottom: number,
  direction: 'left' | 'right',
  glueTabWidthMm: number,
): Point[] {
  const wallHeight = yBottom - yTop
  const inset = Math.min(glueTabWidthMm * 0.45, Math.max(4, wallHeight * 0.2))
  const offset = direction === 'left' ? -glueTabWidthMm : glueTabWidthMm

  return [
    { x, y: yTop },
    { x: x + offset, y: yTop + inset },
    { x: x + offset, y: yBottom - inset },
    { x, y: yBottom },
  ]
}

function createHorizontalAlignmentTab(
  xStart: number,
  xEnd: number,
  yAttach: number,
  depth: number,
  direction: 'up' | 'down',
): Point[] {
  const offset = direction === 'up' ? -depth : depth
  const inset = Math.min(depth * 0.28, Math.max(1.5, (xEnd - xStart) * 0.16))

  return [
    { x: roundMm(xStart), y: yAttach },
    { x: roundMm(xStart + inset), y: roundMm(yAttach + offset) },
    { x: roundMm(xEnd - inset), y: roundMm(yAttach + offset) },
    { x: roundMm(xEnd), y: yAttach },
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

function createHorizontalEdgeCutPaths(
  context: ShapeGenerationContext,
  partId: string,
  prefix: string,
  y: number,
  tabs: Tab[],
  width: number,
) {
  const cutPaths: CutPath[] = []
  let cursorX = 0

  for (const [index, tab] of tabs.entries()) {
    if (tab.attachStart.x > cursorX) {
      cutPaths.push(
        createCutPath(
          context,
          partId,
          `${prefix}-${index + 1}`,
          [
            { x: roundMm(cursorX), y },
            { x: roundMm(tab.attachStart.x), y },
          ],
          false,
        ),
      )
    }

    cursorX = tab.attachEnd.x
  }

  if (cursorX < width) {
    cutPaths.push(
      createCutPath(
        context,
        partId,
        `${prefix}-${tabs.length + 1}`,
        [
          { x: roundMm(cursorX), y },
          { x: roundMm(width), y },
        ],
        false,
      ),
    )
  }

  return cutPaths
}

export function generateCylinderTemplate(
  input: CylinderInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const radius = input.diameterMm / 2
  const circumferenceMm = roundMm(Math.PI * input.diameterMm)
  const glueTabWidthMm = roundMm(Math.min(Math.max(circumferenceMm * 0.08, 10), 18))
  const alignmentTabDepthMm = roundMm(Math.min(Math.max(radius * 0.35, 8), 14))
  const alignmentEdgeInsetMm = roundMm(
    Math.min(Math.max(glueTabWidthMm * 0.45, 4), Math.max(4, circumferenceMm * 0.08)),
  )
  const usableAlignmentWidthMm = Math.max(
    circumferenceMm - alignmentEdgeInsetMm * 2,
    circumferenceMm * 0.6,
  )
  const preferredAlignmentTabCount = Math.min(
    MAX_ALIGNMENT_TAB_COUNT,
    Math.max(MIN_ALIGNMENT_TAB_COUNT, Math.round(usableAlignmentWidthMm / 48)),
  )
  const maxAlignmentTabCount = Math.max(1, Math.floor(usableAlignmentWidthMm / 14))
  const alignmentTabCount = Math.max(1, Math.min(preferredAlignmentTabCount, maxAlignmentTabCount))
  const alignmentSlotWidthMm = usableAlignmentWidthMm / alignmentTabCount
  const alignmentTabWidthMm = roundMm(
    Math.min(
      Math.max(alignmentSlotWidthMm * 0.62, 8),
      Math.min(MAX_ALIGNMENT_TAB_WIDTH_MM, alignmentSlotWidthMm - 2),
    ),
  )
  const bodyOutline = createRectangle(0, 0, circumferenceMm, input.heightMm)
  const capRowY = input.heightMm + CAP_GAP_MM + radius
  const topCapCenterX = (circumferenceMm - input.diameterMm * 2 - CAP_GAP_MM) / 2 + radius
  const bottomCapCenterX = topCapCenterX + input.diameterMm + CAP_GAP_MM
  const topCapOutline = createCircle(topCapCenterX, capRowY, radius, CAP_SEGMENT_COUNT)
  const bottomCapOutline = createCircle(bottomCapCenterX, capRowY, radius, CAP_SEGMENT_COUNT)

  const panels: Panel[] = [
    {
      id: createEntityId(context, 'panel', 'body-wrap'),
      partId,
      name: 'Body Wrap',
      outline: bodyOutline,
      bounds: getBounds(bodyOutline),
    },
    {
      id: createEntityId(context, 'panel', 'top-cap'),
      partId,
      name: 'Top Cap',
      outline: topCapOutline,
      bounds: getBounds(topCapOutline),
    },
    {
      id: createEntityId(context, 'panel', 'bottom-cap'),
      partId,
      name: 'Bottom Cap',
      outline: bottomCapOutline,
      bounds: getBounds(bottomCapOutline),
    },
  ]

  const glueSeamTab = createTab(
    context,
    partId,
    'glue-seam',
    'Glue Seam',
    createVerticalGlueTab(circumferenceMm, 0, input.heightMm, 'right', glueTabWidthMm),
  )
  const topAlignmentTabs = Array.from({ length: alignmentTabCount }, (_, index) => {
    const slotStart = alignmentEdgeInsetMm + index * alignmentSlotWidthMm
    const tabStart = roundMm(slotStart + (alignmentSlotWidthMm - alignmentTabWidthMm) / 2)
    const tabEnd = roundMm(tabStart + alignmentTabWidthMm)

    return createTab(
      context,
      partId,
      `top-alignment-${index + 1}`,
      `Top Alignment Tab ${index + 1}`,
      createHorizontalAlignmentTab(tabStart, tabEnd, 0, alignmentTabDepthMm, 'up'),
    )
  })
  const bottomAlignmentTabs = Array.from({ length: alignmentTabCount }, (_, index) => {
    const slotStart = alignmentEdgeInsetMm + index * alignmentSlotWidthMm
    const tabStart = roundMm(slotStart + (alignmentSlotWidthMm - alignmentTabWidthMm) / 2)
    const tabEnd = roundMm(tabStart + alignmentTabWidthMm)

    return createTab(
      context,
      partId,
      `bottom-alignment-${index + 1}`,
      `Bottom Alignment Tab ${index + 1}`,
      createHorizontalAlignmentTab(tabStart, tabEnd, input.heightMm, alignmentTabDepthMm, 'down'),
    )
  })
  const tabs: Tab[] = [glueSeamTab, ...topAlignmentTabs, ...bottomAlignmentTabs]

  const cutPaths: CutPath[] = [
    createCutPath(context, partId, 'body-left-edge', [{ x: 0, y: 0 }, { x: 0, y: input.heightMm }], false),
    ...createHorizontalEdgeCutPaths(context, partId, 'body-top-edge', 0, topAlignmentTabs, circumferenceMm),
    ...createHorizontalEdgeCutPaths(
      context,
      partId,
      'body-bottom-edge',
      input.heightMm,
      bottomAlignmentTabs,
      circumferenceMm,
    ),
    ...tabs.map((tab) => createCutPath(context, partId, tab.id, tab.outline, false)),
    createCutPath(context, partId, 'top-cap', topCapOutline, true),
    createCutPath(context, partId, 'bottom-cap', bottomCapOutline, true),
  ]
  const foldLines: FoldLine[] = [
    createFoldLine(
      context,
      partId,
      'glue-seam',
      { x: circumferenceMm, y: 0 },
      { x: circumferenceMm, y: input.heightMm },
    ),
    ...topAlignmentTabs.map((tab, index) =>
      createFoldLine(context, partId, `top-alignment-${index + 1}`, tab.attachStart, tab.attachEnd),
    ),
    ...bottomAlignmentTabs.map((tab, index) =>
      createFoldLine(context, partId, `bottom-alignment-${index + 1}`, tab.attachStart, tab.attachEnd),
    ),
  ]

  const leftSeamEdgeId = createEntityId(context, 'join-edge', 'seam-left')
  const rightSeamEdgeId = createEntityId(context, 'join-edge', 'seam-right')
  const joinEdges: JoinEdge[] = [
    {
      id: leftSeamEdgeId,
      partId,
      start: { x: 0, y: 0 },
      end: { x: 0, y: input.heightMm },
      label: 'Seam A',
      partnerId: rightSeamEdgeId,
    },
    {
      id: rightSeamEdgeId,
      partId,
      start: { x: circumferenceMm, y: 0 },
      end: { x: circumferenceMm, y: input.heightMm },
      label: 'Seam A',
      partnerId: leftSeamEdgeId,
    },
  ]

  const annotations: Annotation[] = [
    createPanelAnnotation(context, panels[0]!, 'Body Wrap'),
    createPanelAnnotation(context, panels[1]!, 'Top Cap'),
    createPanelAnnotation(context, panels[2]!, 'Bottom Cap'),
    createRegistrationAnnotation(
      context,
      'seam-left',
      'Seam A',
      { x: 8, y: input.heightMm / 2 },
      leftSeamEdgeId,
    ),
    createRegistrationAnnotation(
      context,
      'seam-right',
      'Seam A',
      { x: circumferenceMm - 8, y: input.heightMm / 2 },
      rightSeamEdgeId,
    ),
  ]

  const partBounds = getOutlineBounds([
    ...panels.map((panel) => panel.outline),
    ...tabs.map((tab) => tab.outline),
  ])
  const part: TemplatePart = {
    id: partId,
    name: 'Straight Cylinder',
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
      shapeType: 'cylinder',
      dimensionsMm: {
        diameter: input.diameterMm,
        height: input.heightMm,
        circumference: circumferenceMm,
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
            ? 'Primary side seam fold for the cylinder glue tab'
            : 'Alignment tab fold for cylindrical cap placement',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-body'),
          text: 'Fold the glue seam tab in first, then wrap the body panel into a tube and align the two Seam A edges before securing the seam.',
          step: 1,
        },
        {
          id: createEntityId(context, 'note', 'attach-caps'),
          text: 'Fold the top and bottom alignment tabs inward, then attach the caps once the cylindrical wall is fully aligned and secured.',
          step: 2,
        },
      ],
      pages: [],
      metadata: {
        profile: 'straight-cylinder',
        glueTabWidth: glueTabWidthMm,
        alignmentTabCount,
        alignmentTabDepth: alignmentTabDepthMm,
        queueStatus: 'draft',
      },
    },
  }
}
