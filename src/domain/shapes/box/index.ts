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

export type BoxStyle = 'glue-tab-carton' | 'tuck-carton' | 'open-tray'

export interface BoxInput {
  externalLengthMm: number
  externalWidthMm: number
  externalHeightMm: number
  glueTabWidthMm: number
  style: BoxStyle
}

interface EdgeTabSpec {
  id: string
  label: string
  outline: Point[]
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

function createHorizontalFlap(
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

function createTuckFlap(
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

function buildTemplateItem(
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

function buildOpenTrayTemplate(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const { externalHeightMm, externalLengthMm, externalWidthMm, glueTabWidthMm } = input
  const partId = createEntityId(context, 'part', 'main')
  const x0 = externalHeightMm + glueTabWidthMm
  const y0 = externalHeightMm
  const baseOutline = createRectangle(x0, y0, externalLengthMm, externalWidthMm)
  const leftWallOutline = createRectangle(
    x0 - externalHeightMm,
    y0,
    externalHeightMm,
    externalWidthMm,
  )
  const rightWallOutline = createRectangle(
    x0 + externalLengthMm,
    y0,
    externalHeightMm,
    externalWidthMm,
  )
  const frontWallOutline = createRectangle(
    x0,
    y0 + externalWidthMm,
    externalLengthMm,
    externalHeightMm,
  )
  const backWallOutline = createRectangle(
    x0,
    y0 - externalHeightMm,
    externalLengthMm,
    externalHeightMm,
  )

  const panels: Panel[] = [
    {
      id: createEntityId(context, 'panel', 'base'),
      partId,
      name: 'Base',
      outline: baseOutline,
      bounds: getBounds(baseOutline),
    },
    {
      id: createEntityId(context, 'panel', 'left-wall'),
      partId,
      name: 'Left Wall',
      outline: leftWallOutline,
      bounds: getBounds(leftWallOutline),
    },
    {
      id: createEntityId(context, 'panel', 'right-wall'),
      partId,
      name: 'Right Wall',
      outline: rightWallOutline,
      bounds: getBounds(rightWallOutline),
    },
    {
      id: createEntityId(context, 'panel', 'front-wall'),
      partId,
      name: 'Front Wall',
      outline: frontWallOutline,
      bounds: getBounds(frontWallOutline),
    },
    {
      id: createEntityId(context, 'panel', 'back-wall'),
      partId,
      name: 'Back Wall',
      outline: backWallOutline,
      bounds: getBounds(backWallOutline),
    },
  ]

  const tabs: Tab[] = [
    createTab(
      context,
      partId,
      'top-left',
      'Tab A',
      createVerticalGlueTab(x0, y0 - externalHeightMm, y0, 'left', glueTabWidthMm),
    ),
    createTab(
      context,
      partId,
      'top-right',
      'Tab B',
      createVerticalGlueTab(
        x0 + externalLengthMm,
        y0 - externalHeightMm,
        y0,
        'right',
        glueTabWidthMm,
      ),
    ),
    createTab(
      context,
      partId,
      'bottom-left',
      'Tab C',
      createVerticalGlueTab(
        x0,
        y0 + externalWidthMm,
        y0 + externalWidthMm + externalHeightMm,
        'left',
        glueTabWidthMm,
      ),
    ),
    createTab(
      context,
      partId,
      'bottom-right',
      'Tab D',
      createVerticalGlueTab(
        x0 + externalLengthMm,
        y0 + externalWidthMm,
        y0 + externalWidthMm + externalHeightMm,
        'right',
        glueTabWidthMm,
      ),
    ),
  ]

  const outline: Point[] = [
    { x: x0, y: y0 - externalHeightMm },
    { x: x0 + externalLengthMm, y: y0 - externalHeightMm },
    { x: x0 + externalLengthMm, y: y0 },
    { x: x0 + externalLengthMm + externalHeightMm, y: y0 },
    { x: x0 + externalLengthMm + externalHeightMm, y: y0 + externalWidthMm },
    { x: x0 + externalLengthMm, y: y0 + externalWidthMm },
    { x: x0 + externalLengthMm, y: y0 + externalWidthMm + externalHeightMm },
    { x: x0, y: y0 + externalWidthMm + externalHeightMm },
    { x: x0, y: y0 + externalWidthMm },
    { x: x0 - externalHeightMm, y: y0 + externalWidthMm },
    { x: x0 - externalHeightMm, y: y0 },
    { x: x0, y: y0 },
  ]

  const cutPaths: CutPath[] = [
    {
      id: createEntityId(context, 'cut', 'outline'),
      partId,
      path: outline,
      style: 'solid',
      closed: true,
    },
  ]

  const foldLines: FoldLine[] = [
    {
      id: createEntityId(context, 'fold', 'back-wall'),
      partId,
      start: { x: x0, y: y0 },
      end: { x: x0 + externalLengthMm, y: y0 },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'front-wall'),
      partId,
      start: { x: x0, y: y0 + externalWidthMm },
      end: { x: x0 + externalLengthMm, y: y0 + externalWidthMm },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'left-wall'),
      partId,
      start: { x: x0, y: y0 },
      end: { x: x0, y: y0 + externalWidthMm },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'right-wall'),
      partId,
      start: { x: x0 + externalLengthMm, y: y0 },
      end: { x: x0 + externalLengthMm, y: y0 + externalWidthMm },
      foldType: 'score',
      style: 'dashed',
    },
    ...tabs.map((tab) => ({
      id: createEntityId(context, 'fold', `tab-${tab.id}`),
      partId,
      start: tab.attachStart,
      end: tab.attachEnd,
      foldType: 'score' as const,
      style: 'dashed' as const,
    })),
  ]

  return buildTemplateItem(
    input,
    context,
    panels,
    cutPaths,
    foldLines,
    tabs,
    'Fold the four walls up and glue the corner tabs behind the front and back walls to complete the tray.',
  )
}

function buildCartonTemplate(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const { externalHeightMm, externalLengthMm, externalWidthMm, glueTabWidthMm, style } = input
  const partId = createEntityId(context, 'part', 'main')
  const topMajorDepth = externalWidthMm * 0.82
  const stripY = topMajorDepth
  const stripBottom = stripY + externalHeightMm
  const widths = [externalLengthMm, externalWidthMm, externalLengthMm, externalWidthMm]
  const panelNames = ['Front Panel', 'Right Panel', 'Back Panel', 'Left Panel']
  const panelIds = ['front', 'right', 'back', 'left']

  let cursorX = 0
  const panels: Panel[] = widths.map((width, index) => {
    const outline = createRectangle(cursorX, stripY, width, externalHeightMm)
    const panel: Panel = {
      id: createEntityId(context, 'panel', panelIds[index]!),
      partId,
      name: panelNames[index]!,
      outline,
      bounds: getBounds(outline),
    }
    cursorX += width
    return panel
  })

  const frontPanel = panels[0]!
  const rightPanel = panels[1]!
  const backPanel = panels[2]!
  const leftPanel = panels[3]!
  const frontMajorDepth = externalWidthMm * 0.85
  const backMajorDepth = externalWidthMm * 0.7
  const sideFlapDepth = Math.max(externalWidthMm * 0.45, 14)
  const bottomFlapDepth = externalWidthMm * 0.78
  const bottomSideDepth = Math.max(externalWidthMm * 0.42, 12)

  const flapSpecs: EdgeTabSpec[] = [
    {
      id: 'glue-seam',
      label: 'Glue Seam',
      outline: createVerticalGlueTab(leftPanel.bounds.maxX, stripY, stripBottom, 'right', glueTabWidthMm),
    },
  ]

  if (style === 'glue-tab-carton') {
    flapSpecs.push(
      {
        id: 'top-front-flap',
        label: 'Top Front Flap',
        outline: createHorizontalFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripY, frontMajorDepth, 'up'),
      },
      {
        id: 'top-right-flap',
        label: 'Top Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripY, sideFlapDepth, 'up', 0.15),
      },
      {
        id: 'top-back-flap',
        label: 'Top Back Flap',
        outline: createHorizontalFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripY, frontMajorDepth, 'up'),
      },
      {
        id: 'top-left-flap',
        label: 'Top Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripY, sideFlapDepth, 'up', 0.15),
      },
      {
        id: 'bottom-front-flap',
        label: 'Bottom Front Flap',
        outline: createHorizontalFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripBottom, bottomFlapDepth, 'down'),
      },
      {
        id: 'bottom-right-flap',
        label: 'Bottom Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripBottom, bottomSideDepth, 'down', 0.15),
      },
      {
        id: 'bottom-back-flap',
        label: 'Bottom Back Flap',
        outline: createHorizontalFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripBottom, bottomFlapDepth, 'down'),
      },
      {
        id: 'bottom-left-flap',
        label: 'Bottom Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripBottom, bottomSideDepth, 'down', 0.15),
      },
    )
  } else {
    flapSpecs.push(
      {
        id: 'top-front-tuck',
        label: 'Top Tuck Flap',
        outline: createTuckFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripY, frontMajorDepth, 'up'),
      },
      {
        id: 'top-right-dust',
        label: 'Top Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripY, sideFlapDepth, 'up', 0.18),
      },
      {
        id: 'top-back-lock',
        label: 'Top Back Flap',
        outline: createHorizontalFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripY, backMajorDepth, 'up', 0.06),
      },
      {
        id: 'top-left-dust',
        label: 'Top Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripY, sideFlapDepth, 'up', 0.18),
      },
      {
        id: 'bottom-front-flap',
        label: 'Bottom Front Flap',
        outline: createHorizontalFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripBottom, backMajorDepth, 'down', 0.06),
      },
      {
        id: 'bottom-right-dust',
        label: 'Bottom Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripBottom, bottomSideDepth, 'down', 0.18),
      },
      {
        id: 'bottom-back-tuck',
        label: 'Bottom Tuck Flap',
        outline: createTuckFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripBottom, frontMajorDepth, 'down'),
      },
      {
        id: 'bottom-left-dust',
        label: 'Bottom Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripBottom, bottomSideDepth, 'down', 0.18),
      },
    )
  }

  const tabs = flapSpecs.map((spec) => createTab(context, partId, spec.id, spec.label, spec.outline))
  const cutPaths: CutPath[] = [
    {
      id: createEntityId(context, 'cut', 'left-edge'),
      partId,
      path: [
        { x: frontPanel.bounds.minX, y: stripY },
        { x: frontPanel.bounds.minX, y: stripBottom },
      ],
      style: 'solid',
      closed: false,
    },
    ...tabs.map((tab) => ({
      id: createEntityId(context, 'cut', tab.id),
      partId,
      path: tab.outline,
      style: 'solid' as const,
      closed: false,
    })),
  ]
  const foldLines: FoldLine[] = [
    {
      id: createEntityId(context, 'fold', 'front-right'),
      partId,
      start: { x: frontPanel.bounds.maxX, y: stripY },
      end: { x: frontPanel.bounds.maxX, y: stripBottom },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'right-back'),
      partId,
      start: { x: rightPanel.bounds.maxX, y: stripY },
      end: { x: rightPanel.bounds.maxX, y: stripBottom },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'back-left'),
      partId,
      start: { x: backPanel.bounds.maxX, y: stripY },
      end: { x: backPanel.bounds.maxX, y: stripBottom },
      foldType: 'score',
      style: 'dashed',
    },
    {
      id: createEntityId(context, 'fold', 'glue-seam'),
      partId,
      start: { x: leftPanel.bounds.maxX, y: stripY },
      end: { x: leftPanel.bounds.maxX, y: stripBottom },
      foldType: 'score',
      style: 'dashed',
    },
    ...tabs.map((tab) => ({
      id: createEntityId(context, 'fold', `tab-${tab.id}`),
      partId,
      start: tab.attachStart,
      end: tab.attachEnd,
      foldType: 'score' as const,
      style: 'dashed' as const,
    })),
  ]

  return buildTemplateItem(
    input,
    context,
    panels,
    cutPaths,
    foldLines,
    tabs,
    style === 'glue-tab-carton'
      ? 'Glue the side seam first, then close the top and bottom flaps in sequence for a permanent carton build.'
      : 'Glue the side seam first, then use the tuck flaps and dust flaps to close the carton without additional adhesive.',
  )
}

export function generateBoxTemplate(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  if (input.style === 'open-tray') {
    return buildOpenTrayTemplate(input, context)
  }

  return buildCartonTemplate(input, context)
}
