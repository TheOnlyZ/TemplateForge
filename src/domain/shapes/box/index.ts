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
import type { Net } from '../../geometry/net.ts'
import { getBoxNetGenerator, buildOpenTrayCarton, type BoxNetType } from './nets.ts'
export { generateBoxTemplateCandidates, type BoxTemplateCandidate } from './candidates.ts'

export type BoxStyle = 'glue-tab-carton' | 'tuck-carton' | 'open-tray'

export interface BoxInput {
  externalLengthMm: number
  externalWidthMm: number
  externalHeightMm: number
  glueTabWidthMm: number
  style: BoxStyle
  netType?: BoxNetType
}

export interface BoxNetValidationSource {
  netType: BoxNetType | null
  net: Net
}

export interface EdgeTabSpec {
  id: string
  label: string
  outline: Point[]
}

export function createVerticalGlueTab(
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

export function createHorizontalFlap(
  xStart: number,
  xEnd: number,
  yAttach: number,
  depth: number,
  direction: 'up' | 'down',
  taper = 0,
): Point[] {
  const offset = direction === 'up' ? -depth : depth
  const inset = Math.min(Math.abs(depth) * taper, Math.abs(xEnd - xStart) * 0.2)

  return [
    { x: xStart, y: yAttach },
    { x: xStart + inset, y: yAttach + offset },
    { x: xEnd - inset, y: yAttach + offset },
    { x: xEnd, y: yAttach },
  ]
}

export function createTuckFlap(
  xStart: number,
  xEnd: number,
  yAttach: number,
  depth: number,
  direction: 'up' | 'down',
): Point[] {
  const offset = direction === 'up' ? -depth : depth
  const shoulder = Math.min((xEnd - xStart) * 0.12, depth * 0.2)
  const neckInset = Math.min((xEnd - xStart) * 0.24, depth * 0.45)

  return [
    { x: xStart, y: yAttach },
    { x: xStart + shoulder, y: yAttach + offset * 0.25 },
    { x: xStart + neckInset, y: yAttach + offset },
    { x: xEnd - neckInset, y: yAttach + offset },
    { x: xEnd - shoulder, y: yAttach + offset * 0.25 },
    { x: xEnd, y: yAttach },
  ]
}

export function createPanelAnnotation(
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

export function createTab(
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

export function buildTemplateItem(
  input: BoxInput,
  context: ShapeGenerationContext,
  panels: Panel[],
  cutPaths: CutPath[],
  foldLines: FoldLine[],
  tabs: Tab[],
  assemblyNote: string,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const partBounds = getOutlineBounds([
    ...panels.map((panel) => panel.outline),
    ...cutPaths.map((path) => path.path),
    ...tabs.map((tab) => tab.outline),
  ])
  const part: TemplatePart = {
    id: partId,
    name:
      input.style === 'open-tray'
        ? 'Open Tray'
        : input.style === 'glue-tab-carton'
          ? 'Glue Tab Carton'
          : 'Tuck Carton',
    panelIds: panels.map((panel) => panel.id),
    cutPathIds: cutPaths.map((path) => path.id),
    foldLineIds: foldLines.map((line) => line.id),
    tabIds: tabs.map((tab) => tab.id),
    joinEdgeIds: [],
    bounds: partBounds,
  }

  return {
    template: {
      id: context.itemId,
      version: 1,
      name: context.itemName,
      shapeType: 'box',
      dimensionsMm: {
        length: input.externalLengthMm,
        width: input.externalWidthMm,
        height: input.externalHeightMm,
        glueTabWidth: input.glueTabWidthMm,
      },
      parts: [part],
      panels,
      cutPaths,
      foldLines,
      tabs,
      joinEdges: [] satisfies JoinEdge[],
      annotations: panels.map((panel) => createPanelAnnotation(context, panel, panel.name)),
      splitCandidates: foldLines.map((line, index) => ({
        id: createEntityId(context, 'split', `fold-${index + 1}`),
        partId,
        start: line.start,
        end: line.end,
        kind: 'fold',
        priority: index + 1,
        reason: `Fold line ${index + 1} for ${input.style}`,
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'assembly'),
          text: assemblyNote,
          step: 1,
        },
      ],
      pages: [],
      metadata: {
        style: input.style,
        queueStatus: 'draft',
      },
    },
  }
}

function buildCartonTemplate(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const generator = getBoxNetGenerator(input.netType ?? 'strip')
  return generator(input, context)
}

export function generateBoxTemplate(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  if (input.style === 'open-tray') {
    return buildOpenTrayCarton(input, context)
  }

  return buildCartonTemplate(input, context)
}

export { getBoxNetGenerator } from './nets.ts'
export type { BoxNetType } from './nets.ts'
