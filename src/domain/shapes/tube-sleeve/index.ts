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

export interface TubeInput {
  diameterMm: number
  heightMm: number
}

export interface SleeveInput {
  diameterMm: number
  heightMm: number
  overlapMm?: number
}

const DEFAULT_SLEEVE_OVERLAP_MM = 16

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

function buildTubeTemplate(
  input: TubeInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const circumferenceMm = roundMm(Math.PI * input.diameterMm)
  const glueTabWidthMm = roundMm(Math.min(Math.max(circumferenceMm * 0.08, 10), 18))
  const bodyOutline = createRectangle(0, 0, circumferenceMm, input.heightMm)
  const bodyPanel: Panel = {
    id: createEntityId(context, 'panel', 'body-wrap'),
    partId,
    name: 'Tube Body',
    outline: bodyOutline,
    bounds: getBounds(bodyOutline),
  }
  const glueSeamTab = createTab(
    context,
    partId,
    'glue-seam',
    'Glue Seam',
    createVerticalGlueTab(circumferenceMm, 0, input.heightMm, glueTabWidthMm),
  )
  const cutPaths: CutPath[] = [
    createCutPath(
      context,
      partId,
      'left-edge',
      [
        { x: 0, y: 0 },
        { x: 0, y: input.heightMm },
      ],
      false,
    ),
    createCutPath(
      context,
      partId,
      'top-edge',
      [
        { x: 0, y: 0 },
        { x: circumferenceMm, y: 0 },
      ],
      false,
    ),
    createCutPath(
      context,
      partId,
      'bottom-edge',
      [
        { x: 0, y: input.heightMm },
        { x: circumferenceMm, y: input.heightMm },
      ],
      false,
    ),
    createCutPath(context, partId, 'glue-seam', glueSeamTab.outline, false),
  ]
  const foldLines: FoldLine[] = [
    createFoldLine(
      context,
      partId,
      'glue-seam',
      { x: circumferenceMm, y: 0 },
      { x: circumferenceMm, y: input.heightMm },
    ),
  ]
  const joinEdges: JoinEdge[] = [
    {
      id: createEntityId(context, 'join-edge', 'seam-a-left'),
      partId,
      start: { x: 0, y: 0 },
      end: { x: 0, y: input.heightMm },
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'seam-a-right'),
    },
    {
      id: createEntityId(context, 'join-edge', 'seam-a-right'),
      partId,
      start: { x: circumferenceMm, y: 0 },
      end: { x: circumferenceMm, y: input.heightMm },
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'seam-a-left'),
    },
  ]
  const annotations: Annotation[] = [
    createPanelAnnotation(context, bodyPanel, 'Tube Body'),
    createRegistrationAnnotation(
      context,
      'tube-seam-left',
      'Seam A',
      { x: 8, y: input.heightMm / 2 },
      joinEdges[0]!.id,
    ),
    createRegistrationAnnotation(
      context,
      'tube-seam-right',
      'Seam A',
      { x: circumferenceMm - 8, y: input.heightMm / 2 },
      joinEdges[1]!.id,
    ),
  ]
  const partBounds = getOutlineBounds([bodyPanel.outline, glueSeamTab.outline])
  const part: TemplatePart = {
    id: partId,
    name: 'Tube',
    panelIds: [bodyPanel.id],
    cutPathIds: cutPaths.map((path) => path.id),
    foldLineIds: foldLines.map((line) => line.id),
    tabIds: [glueSeamTab.id],
    joinEdgeIds: joinEdges.map((edge) => edge.id),
    bounds: partBounds,
  }

  return {
    template: {
      id: context.itemId,
      version: 1,
      name: context.itemName,
      shapeType: 'tube',
      dimensionsMm: {
        diameter: input.diameterMm,
        height: input.heightMm,
        circumference: circumferenceMm,
      },
      parts: [part],
      panels: [bodyPanel],
      cutPaths,
      foldLines,
      tabs: [glueSeamTab],
      joinEdges,
      annotations,
      splitCandidates: foldLines.map((line, index) => ({
        id: createEntityId(context, 'split', `fold-${index + 1}`),
        partId,
        start: line.start,
        end: line.end,
        kind: 'fold',
        priority: index + 1,
        reason: 'Primary seam fold for the tube body wrap',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-body'),
          text: 'Pre-curve the wrap, fold the glue seam inward, and align the two Seam A edges to form the finished tube.',
          step: 1,
        },
      ],
      pages: [],
      metadata: {
        profile: 'tube',
        glueTabWidth: glueTabWidthMm,
        queueStatus: 'draft',
      },
    },
  }
}

function buildSleeveTemplate(
  input: SleeveInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const circumferenceMm = roundMm(Math.PI * input.diameterMm)
  const overlapMm = roundMm(input.overlapMm ?? DEFAULT_SLEEVE_OVERLAP_MM)
  const bodyOutline = createRectangle(0, 0, circumferenceMm, input.heightMm)
  const overlapOutline = createRectangle(circumferenceMm, 0, overlapMm, input.heightMm)
  const bodyPanel: Panel = {
    id: createEntityId(context, 'panel', 'body-wrap'),
    partId,
    name: 'Body Sleeve',
    outline: bodyOutline,
    bounds: getBounds(bodyOutline),
  }
  const overlapPanel: Panel = {
    id: createEntityId(context, 'panel', 'overlap-panel'),
    partId,
    name: 'Overlap Sleeve',
    outline: overlapOutline,
    bounds: getBounds(overlapOutline),
  }
  const cutPaths: CutPath[] = [
    createCutPath(
      context,
      partId,
      'left-edge',
      [
        { x: 0, y: 0 },
        { x: 0, y: input.heightMm },
      ],
      false,
    ),
    createCutPath(
      context,
      partId,
      'top-edge',
      [
        { x: 0, y: 0 },
        { x: circumferenceMm + overlapMm, y: 0 },
      ],
      false,
    ),
    createCutPath(
      context,
      partId,
      'right-edge',
      [
        { x: circumferenceMm + overlapMm, y: 0 },
        { x: circumferenceMm + overlapMm, y: input.heightMm },
      ],
      false,
    ),
    createCutPath(
      context,
      partId,
      'bottom-edge',
      [
        { x: 0, y: input.heightMm },
        { x: circumferenceMm + overlapMm, y: input.heightMm },
      ],
      false,
    ),
  ]
  const foldLines: FoldLine[] = [
    createFoldLine(
      context,
      partId,
      'overlap-seam',
      { x: circumferenceMm, y: 0 },
      { x: circumferenceMm, y: input.heightMm },
    ),
  ]
  const joinEdges: JoinEdge[] = [
    {
      id: createEntityId(context, 'join-edge', 'sleeve-a-start'),
      partId,
      start: { x: 0, y: 0 },
      end: { x: 0, y: input.heightMm },
      label: 'Sleeve A',
      partnerId: createEntityId(context, 'join-edge', 'sleeve-a-overlap'),
    },
    {
      id: createEntityId(context, 'join-edge', 'sleeve-a-overlap'),
      partId,
      start: { x: circumferenceMm, y: 0 },
      end: { x: circumferenceMm, y: input.heightMm },
      label: 'Sleeve A',
      partnerId: createEntityId(context, 'join-edge', 'sleeve-a-start'),
    },
  ]
  const annotations: Annotation[] = [
    createPanelAnnotation(context, bodyPanel, 'Body Sleeve'),
    createPanelAnnotation(context, overlapPanel, 'Overlap Sleeve'),
    createRegistrationAnnotation(
      context,
      'sleeve-start',
      'Sleeve A',
      { x: 8, y: input.heightMm / 2 },
      joinEdges[0]!.id,
    ),
    createRegistrationAnnotation(
      context,
      'sleeve-overlap',
      'Sleeve A',
      { x: circumferenceMm - 8, y: input.heightMm / 2 },
      joinEdges[1]!.id,
    ),
  ]
  const partBounds = getOutlineBounds([bodyPanel.outline, overlapPanel.outline])
  const part: TemplatePart = {
    id: partId,
    name: 'Sleeve',
    panelIds: [bodyPanel.id, overlapPanel.id],
    cutPathIds: cutPaths.map((path) => path.id),
    foldLineIds: foldLines.map((line) => line.id),
    tabIds: [],
    joinEdgeIds: joinEdges.map((edge) => edge.id),
    bounds: partBounds,
  }

  return {
    template: {
      id: context.itemId,
      version: 1,
      name: context.itemName,
      shapeType: 'sleeve',
      dimensionsMm: {
        diameter: input.diameterMm,
        height: input.heightMm,
        circumference: circumferenceMm,
        overlap: overlapMm,
      },
      parts: [part],
      panels: [bodyPanel, overlapPanel],
      cutPaths,
      foldLines,
      tabs: [],
      joinEdges,
      annotations,
      splitCandidates: foldLines.map((line, index) => ({
        id: createEntityId(context, 'split', `fold-${index + 1}`),
        partId,
        start: line.start,
        end: line.end,
        kind: 'fold',
        priority: index + 1,
        reason: 'Primary overlap fold for the sleeve seam',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-sleeve'),
          text: 'Wrap the body around the target form, fold the overlap sleeve in, and align the two Sleeve A edges before securing the seam.',
          step: 1,
        },
      ],
      pages: [],
      metadata: {
        profile: 'sleeve',
        overlap: overlapMm,
        queueStatus: 'draft',
      },
    },
  }
}

export function generateTubeTemplate(input: TubeInput, context: ShapeGenerationContext) {
  return buildTubeTemplate(input, context)
}

export function generateSleeveTemplate(input: SleeveInput, context: ShapeGenerationContext) {
  return buildSleeveTemplate(input, context)
}
