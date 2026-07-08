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

export interface ConicalFrustumInput {
  baseDiameterMm: number
  topDiameterMm: number
  heightMm: number
}

const CAP_GAP_MM = 12
const ARC_SEGMENT_COUNT = 40

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

function createCircle(centerX: number, centerY: number, radius: number, segmentCount: number): Point[] {
  return Array.from({ length: segmentCount }, (_, index) => {
    const angle = -Math.PI / 2 + (index / segmentCount) * Math.PI * 2

    return {
      x: roundMm(centerX + Math.cos(angle) * radius),
      y: roundMm(centerY + Math.sin(angle) * radius),
    }
  })
}

function createArc(
  center: Point,
  radius: number,
  startAngleRad: number,
  endAngleRad: number,
  segmentCount: number,
) {
  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const angle = startAngleRad + ((endAngleRad - startAngleRad) * index) / segmentCount

    return {
      x: roundMm(center.x + Math.cos(angle) * radius),
      y: roundMm(center.y + Math.sin(angle) * radius),
    }
  })
}

function createRadialGlueTab(
  attachStart: Point,
  attachEnd: Point,
  glueTabWidthMm: number,
): Point[] {
  const deltaX = attachEnd.x - attachStart.x
  const deltaY = attachEnd.y - attachStart.y
  const seamLength = Math.hypot(deltaX, deltaY)
  const tangentX = deltaX / seamLength
  const tangentY = deltaY / seamLength
  const normalX = -tangentY
  const normalY = tangentX
  const inset = Math.min(glueTabWidthMm * 0.4, Math.max(4, seamLength * 0.16))

  return [
    attachStart,
    {
      x: roundMm(attachStart.x + normalX * glueTabWidthMm + tangentX * inset),
      y: roundMm(attachStart.y + normalY * glueTabWidthMm + tangentY * inset),
    },
    {
      x: roundMm(attachEnd.x + normalX * glueTabWidthMm - tangentX * inset),
      y: roundMm(attachEnd.y + normalY * glueTabWidthMm - tangentY * inset),
    },
    attachEnd,
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

export function generateConicalFrustumTemplate(
  input: ConicalFrustumInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const baseRadius = input.baseDiameterMm / 2
  const topRadius = input.topDiameterMm / 2
  const radiusDelta = baseRadius - topRadius

  if (radiusDelta <= 0) {
    throw new Error('Base diameter must be larger than top diameter to generate a cone or truncated cone template.')
  }

  const slantHeight = Math.hypot(input.heightMm, radiusDelta)
  const outerRadius = roundMm((slantHeight * baseRadius) / radiusDelta)
  const innerRadius = roundMm((slantHeight * topRadius) / radiusDelta)
  const sectorAngleRad = (2 * Math.PI * radiusDelta) / slantHeight
  const startAngleRad = -sectorAngleRad / 2
  const endAngleRad = sectorAngleRad / 2
  const glueTabWidthMm = roundMm(Math.min(Math.max(baseRadius * 0.24, 10), 18))
  const center = { x: outerRadius + glueTabWidthMm + 12, y: outerRadius + 12 }
  const outerArc = createArc(center, outerRadius, startAngleRad, endAngleRad, ARC_SEGMENT_COUNT)
  const seamStart =
    innerRadius > 0
      ? {
          x: roundMm(center.x + Math.cos(startAngleRad) * innerRadius),
          y: roundMm(center.y + Math.sin(startAngleRad) * innerRadius),
        }
      : { x: center.x, y: center.y }
  const seamEnd = outerArc[0]!
  const trailingSeamPoint =
    innerRadius > 0
      ? {
          x: roundMm(center.x + Math.cos(endAngleRad) * innerRadius),
          y: roundMm(center.y + Math.sin(endAngleRad) * innerRadius),
        }
      : { x: center.x, y: center.y }
  const bodyOutline =
    innerRadius > 0
      ? [
          ...outerArc,
          trailingSeamPoint,
          ...createArc(center, innerRadius, endAngleRad, startAngleRad, ARC_SEGMENT_COUNT),
        ]
      : [...outerArc, center]
  const bodyPanel: Panel = {
    id: createEntityId(context, 'panel', 'body-wrap'),
    partId,
    name: topRadius === 0 ? 'Cone Body' : 'Frustum Body',
    outline: bodyOutline,
    bounds: getBounds(bodyOutline),
  }
  const panels: Panel[] = [bodyPanel]
  const tabs: Tab[] = [
    createTab(
      context,
      partId,
      'glue-seam',
      'Glue Seam',
      createRadialGlueTab(seamStart, seamEnd, glueTabWidthMm),
    ),
  ]

  const bodyCutPathPoints =
    innerRadius > 0
      ? [...outerArc, trailingSeamPoint, ...createArc(center, innerRadius, endAngleRad, startAngleRad, ARC_SEGMENT_COUNT)]
      : [...outerArc, center]
  const cutPaths: CutPath[] = [
    createCutPath(context, partId, 'body-outline', bodyCutPathPoints, false),
    createCutPath(context, partId, 'glue-seam', tabs[0]!.outline, false),
  ]

  const foldLines: FoldLine[] = [createFoldLine(context, partId, 'glue-seam', seamStart, seamEnd)]
  const joinEdges: JoinEdge[] = [
    {
      id: createEntityId(context, 'join-edge', 'seam-a-start'),
      partId,
      start: seamStart,
      end: seamEnd,
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'seam-a-end'),
    },
    {
      id: createEntityId(context, 'join-edge', 'seam-a-end'),
      partId,
      start: trailingSeamPoint,
      end: outerArc.at(-1)!,
      label: 'Seam A',
      partnerId: createEntityId(context, 'join-edge', 'seam-a-start'),
    },
  ]
  const annotations: Annotation[] = [
    createPanelAnnotation(context, bodyPanel, bodyPanel.name),
    createRegistrationAnnotation(
      context,
      'seam-start',
      'Seam A',
      {
        x: roundMm((seamStart.x + seamEnd.x) / 2 + 10),
        y: roundMm((seamStart.y + seamEnd.y) / 2),
      },
      joinEdges[0]!.id,
    ),
    createRegistrationAnnotation(
      context,
      'seam-end',
      'Seam A',
      {
        x: roundMm((trailingSeamPoint.x + outerArc.at(-1)!.x) / 2 - 10),
        y: roundMm((trailingSeamPoint.y + outerArc.at(-1)!.y) / 2),
      },
      joinEdges[1]!.id,
    ),
  ]

  const capRowY = bodyPanel.bounds.maxY + CAP_GAP_MM + baseRadius
  const baseCapCenterX = bodyPanel.bounds.minX + baseRadius + 12
  const baseCapOutline = createCircle(baseCapCenterX, capRowY, baseRadius, ARC_SEGMENT_COUNT)
  panels.push({
    id: createEntityId(context, 'panel', 'base-cap'),
    partId,
    name: 'Base Cap',
    outline: baseCapOutline,
    bounds: getBounds(baseCapOutline),
  })
  cutPaths.push(createCutPath(context, partId, 'base-cap', baseCapOutline, true))
  annotations.push(createPanelAnnotation(context, panels.at(-1)!, 'Base Cap'))

  if (topRadius > 0) {
    const topCapCenterX = baseCapCenterX + input.baseDiameterMm + CAP_GAP_MM
    const topCapOutline = createCircle(topCapCenterX, capRowY, topRadius, ARC_SEGMENT_COUNT)
    panels.push({
      id: createEntityId(context, 'panel', 'top-cap'),
      partId,
      name: 'Top Cap',
      outline: topCapOutline,
      bounds: getBounds(topCapOutline),
    })
    cutPaths.push(createCutPath(context, partId, 'top-cap', topCapOutline, true))
    annotations.push(createPanelAnnotation(context, panels.at(-1)!, 'Top Cap'))
  }

  const partBounds = getOutlineBounds([
    ...panels.map((panel) => panel.outline),
    ...tabs.map((tab) => tab.outline),
  ])
  const part: TemplatePart = {
    id: partId,
    name: topRadius === 0 ? 'Cone' : 'Truncated Cone',
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
      shapeType: 'cone',
      dimensionsMm: {
        baseDiameter: input.baseDiameterMm,
        topDiameter: input.topDiameterMm,
        height: input.heightMm,
        slantHeight,
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
        reason: 'Primary seam fold for the conical body wrap',
      })),
      assemblyNotes: [
        {
          id: createEntityId(context, 'note', 'wrap-body'),
          text: 'Pre-curve the body wrap, fold the glue seam tab in, and align the two Seam A edges to form the conical shell.',
          step: 1,
        },
        {
          id: createEntityId(context, 'note', 'attach-caps'),
          text:
            topRadius === 0
              ? 'Attach the base cap after the cone seam is secure and the shell holds its final profile.'
              : 'Attach the base and top caps after the frustum seam is secure and the shell holds its final profile.',
          step: 2,
        },
      ],
      pages: [],
      metadata: {
        profile: topRadius === 0 ? 'cone' : 'truncated-cone',
        glueTabWidth: glueTabWidthMm,
        queueStatus: 'draft',
      },
    },
  }
}

export function generateConeTemplate(
  input: Omit<ConicalFrustumInput, 'topDiameterMm'> & { topDiameterMm?: 0 },
  context: ShapeGenerationContext,
) {
  return generateConicalFrustumTemplate(
    {
      ...input,
      topDiameterMm: 0,
    },
    context,
  )
}

export function generateTruncatedConeTemplate(input: ConicalFrustumInput, context: ShapeGenerationContext) {
  return generateConicalFrustumTemplate(input, context)
}
