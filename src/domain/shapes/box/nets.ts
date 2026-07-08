import { getBounds, type Point } from '../../geometry/index.ts'
import type { CutPath, FoldLine, Panel, Tab } from '../../templates/index.ts'
import {
  type ShapeGenerationContext,
} from '../shared/index.ts'
import {
  type BoxInput,
  buildTemplateItem,
  createHorizontalFlap,
  createPanelAnnotation,
  createTab,
  createTuckFlap,
  createVerticalGlueTab,
  type EdgeTabSpec,
} from './index.ts'

export type BoxNetType = 'strip' | 'cross' | 't-layout'

function buildFlapSpecs(
  input: BoxInput,
  panels: Panel[],
): EdgeTabSpec[] {
  const { externalHeightMm, externalLengthMm, externalWidthMm, glueTabWidthMm, style } = input
  const frontPanel = panels.find((p) => p.name === 'Front Panel')!
  const rightPanel = panels.find((p) => p.name === 'Right Panel')!
  const backPanel = panels.find((p) => p.name === 'Back Panel')!
  const leftPanel = panels.find((p) => p.name === 'Left Panel')!
  const stripY = frontPanel.bounds.minY
  const sideFlapDepth = Math.max(externalWidthMm * 0.45, 14)
  const bottomFlapDepth = externalWidthMm * 0.78
  const frontMajorDepth = externalWidthMm * 0.85
  const backMajorDepth = externalWidthMm * 0.7
  const bottomSideDepth = Math.max(externalWidthMm * 0.42, 12)
  const flapSpecs: EdgeTabSpec[] = [
    {
      id: 'glue-seam',
      label: 'Glue Seam',
      outline: createVerticalGlueTab(leftPanel.bounds.maxX, stripY, stripY + externalHeightMm, 'right', glueTabWidthMm),
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
        outline: createHorizontalFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripY + externalHeightMm, bottomFlapDepth, 'down'),
      },
      {
        id: 'bottom-right-flap',
        label: 'Bottom Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripY + externalHeightMm, bottomSideDepth, 'down', 0.15),
      },
      {
        id: 'bottom-back-flap',
        label: 'Bottom Back Flap',
        outline: createHorizontalFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripY + externalHeightMm, bottomFlapDepth, 'down'),
      },
      {
        id: 'bottom-left-flap',
        label: 'Bottom Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripY + externalHeightMm, bottomSideDepth, 'down', 0.15),
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
        outline: createHorizontalFlap(frontPanel.bounds.minX, frontPanel.bounds.maxX, stripY + externalHeightMm, backMajorDepth, 'down', 0.06),
      },
      {
        id: 'bottom-right-dust',
        label: 'Bottom Right Dust Flap',
        outline: createHorizontalFlap(rightPanel.bounds.minX, rightPanel.bounds.maxX, stripY + externalHeightMm, bottomSideDepth, 'down', 0.18),
      },
      {
        id: 'bottom-back-tuck',
        label: 'Bottom Tuck Flap',
        outline: createTuckFlap(backPanel.bounds.minX, backPanel.bounds.maxX, stripY + externalHeightMm, frontMajorDepth, 'down'),
      },
      {
        id: 'bottom-left-dust',
        label: 'Bottom Left Dust Flap',
        outline: createHorizontalFlap(leftPanel.bounds.minX, leftPanel.bounds.maxX, stripY + externalHeightMm, bottomSideDepth, 'down', 0.18),
      },
    )
  }

  return flapSpecs
}

function buildFoldLines(
  context: ShapeGenerationContext,
  partId: string,
  panels: Panel[],
  tabs: Tab[],
): FoldLine[] {
  const foldLines: FoldLine[] = []

  for (const panel of panels) {
    const name = panel.name.toLowerCase().replace(' panel', '')
    foldLines.push({
      id: createEntityIdCtx(context, 'fold', `${name}-attach`),
      partId,
      start: panel.outline[0]!,
      end: panel.outline[3]!,
      foldType: 'score',
      style: 'dashed',
    })
  }

  for (const tab of tabs) {
    foldLines.push({
      id: createEntityIdCtx(context, 'fold', `tab-${tab.id}`),
      partId,
      start: tab.attachStart,
      end: tab.attachEnd,
      foldType: 'score',
      style: 'dashed',
    })
  }

  return foldLines
}

function buildOutlineCutPath(
  context: ShapeGenerationContext,
  partId: string,
  panels: Panel[],
  tabs: Tab[],
): CutPath {
  const allPoints: Point[] = []

  for (const panel of panels) {
    allPoints.push(...panel.outline)
  }

  for (const tab of tabs) {
    allPoints.push(...tab.outline)
  }

  const minX = Math.min(...allPoints.map((p) => p.x))
  const minY = Math.min(...allPoints.map((p) => p.y))
  const maxX = Math.max(...allPoints.map((p) => p.x))
  const maxY = Math.max(...allPoints.map((p) => p.y))

  return {
    id: createEntityIdCtx(context, 'cut', 'outline'),
    partId,
    path: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
    style: 'solid',
    closed: true,
  }
}

function createEntityIdCtx(context: ShapeGenerationContext, entityType: string, name: string) {
  return `${context.itemId}:${entityType}:${name}`
}

export function buildCrossNetCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
) {
  const { externalHeightMm, externalLengthMm, externalWidthMm, style } = input
  const partId = createEntityIdCtx(context, 'part', 'main')
  const topMajorDepth = externalWidthMm * 0.82
  const stripY = topMajorDepth
  const panelCenterX = externalWidthMm
  const panelCenterY = externalHeightMm + topMajorDepth

  const frontPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'front'),
    partId,
    name: 'Front Panel',
    outline: createRect(panelCenterX, panelCenterY, externalLengthMm, externalHeightMm),
    bounds: null!,
  }
  frontPanel.bounds = getBounds(frontPanel.outline)

  const rightPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'right'),
    partId,
    name: 'Right Panel',
    outline: createRect(panelCenterX + externalLengthMm, panelCenterY, externalWidthMm, externalHeightMm),
    bounds: null!,
  }
  rightPanel.bounds = getBounds(rightPanel.outline)

  const backPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'back'),
    partId,
    name: 'Back Panel',
    outline: createRect(panelCenterX, panelCenterY + externalHeightMm, externalLengthMm, externalHeightMm),
    bounds: null!,
  }
  backPanel.bounds = getBounds(backPanel.outline)

  const leftPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'left'),
    partId,
    name: 'Left Panel',
    outline: createRect(panelCenterX - externalWidthMm, panelCenterY, externalWidthMm, externalHeightMm),
    bounds: null!,
  }
  leftPanel.bounds = getBounds(leftPanel.outline)

  const panels = [frontPanel, rightPanel, backPanel, leftPanel]
  const tabs = buildFlapSpecs(input, panels).map((spec) =>
    createTab(context, partId, spec.id, spec.label, spec.outline),
  )
  const foldLines = buildFoldLines(context, partId, panels, tabs)

  const outline: Point[] = [
    { x: frontPanel.bounds.minX, y: frontPanel.bounds.minY },
    { x: frontPanel.bounds.maxX, y: frontPanel.bounds.minY },
    { x: rightPanel.bounds.maxX, y: rightPanel.bounds.minY },
    { x: rightPanel.bounds.maxX, y: rightPanel.bounds.maxY },
    { x: backPanel.bounds.maxX, y: backPanel.bounds.maxY },
    { x: backPanel.bounds.minX, y: backPanel.bounds.maxY },
    { x: leftPanel.bounds.minX, y: leftPanel.bounds.maxY },
    { x: leftPanel.bounds.minX, y: leftPanel.bounds.minY },
    { x: frontPanel.bounds.minX, y: frontPanel.bounds.minY },
  ]

  const cutPaths: CutPath[] = [
    {
      id: createEntityIdCtx(context, 'cut', 'outline'),
      partId,
      path: outline,
      style: 'solid',
      closed: false,
    },
    ...tabs.map((tab) => ({
      id: createEntityIdCtx(context, 'cut', tab.id),
      partId,
      path: tab.outline,
      style: 'solid' as const,
      closed: false,
    })),
  ]

  const assemblyNote =
    style === 'glue-tab-carton'
      ? 'Glue the side seam first, then close the top and bottom flaps in sequence for a permanent carton build.'
      : 'Glue the side seam first, then use the tuck flaps and dust flaps to close the carton without additional adhesive.'

  return buildTemplateItem(input, context, panels, cutPaths, foldLines, tabs, assemblyNote)
}

export function buildTNetCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
) {
  const { externalHeightMm, externalLengthMm, externalWidthMm, style } = input
  const partId = createEntityIdCtx(context, 'part', 'main')
  const topMajorDepth = externalWidthMm * 0.82
  const stripY = topMajorDepth

  const frontPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'front'),
    partId,
    name: 'Front Panel',
    outline: createRect(0, stripY, externalLengthMm, externalHeightMm),
    bounds: null!,
  }
  frontPanel.bounds = getBounds(frontPanel.outline)

  const rightPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'right'),
    partId,
    name: 'Right Panel',
    outline: createRect(externalLengthMm, stripY, externalWidthMm, externalHeightMm),
    bounds: null!,
  }
  rightPanel.bounds = getBounds(rightPanel.outline)

  const backPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'back'),
    partId,
    name: 'Back Panel',
    outline: createRect(externalLengthMm + externalWidthMm, stripY, externalLengthMm, externalHeightMm),
    bounds: null!,
  }
  backPanel.bounds = getBounds(backPanel.outline)

  const leftPanel: Panel = {
    id: createEntityIdCtx(context, 'panel', 'left'),
    partId,
    name: 'Left Panel',
    outline: createRect(externalLengthMm + externalWidthMm + externalLengthMm, stripY, externalWidthMm, externalHeightMm),
    bounds: null!,
  }
  leftPanel.bounds = getBounds(leftPanel.outline)

  const panels = [frontPanel, rightPanel, backPanel, leftPanel]
  const tabs = buildFlapSpecs(input, panels).map((spec) =>
    createTab(context, partId, spec.id, spec.label, spec.outline),
  )
  const foldLines = buildFoldLines(context, partId, panels, tabs)

  const stripRight = leftPanel.bounds.maxX
  const stripBottom = stripY + externalHeightMm

  const outline: Point[] = [
    { x: 0, y: stripY },
    { x: stripRight, y: stripY },
    { x: stripRight, y: stripBottom },
    { x: 0, y: stripBottom },
  ]

  const cutPaths: CutPath[] = [
    {
      id: createEntityIdCtx(context, 'cut', 'left-edge'),
      partId,
      path: [{ x: 0, y: stripY }, { x: 0, y: stripBottom }],
      style: 'solid',
      closed: false,
    },
    ...tabs.map((tab) => ({
      id: createEntityIdCtx(context, 'cut', tab.id),
      partId,
      path: tab.outline,
      style: 'solid' as const,
      closed: false,
    })),
  ]

  const assemblyNote =
    style === 'glue-tab-carton'
      ? 'Glue the side seam first, then close the top and bottom flaps in sequence for a permanent carton build.'
      : 'Glue the side seam first, then use the tuck flaps and dust flaps to close the carton without additional adhesive.'

  return buildTemplateItem(input, context, panels, cutPaths, foldLines, tabs, assemblyNote)
}

function createRect(x: number, y: number, width: number, height: number): Point[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
}

export function getBoxNetGenerator(netType: BoxNetType) {
  switch (netType) {
    case 'cross':
      return buildCrossNetCarton
    case 't-layout':
      return buildTNetCarton
    default:
      return undefined
  }
}
