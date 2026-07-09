import { getBounds, type Point } from '../../geometry/index.ts'
import type { Net } from '../../geometry/net.ts'
import type { CutPath, FoldLine, Panel, Tab } from '../../templates/index.ts'
import { createEntityId, getOutlineBounds, getRectangleCenter, type ShapeGenerationContext, type ShapeGenerationResult } from '../shared/index.ts'
import { buildTemplateItem, type BoxInput } from './index.ts'

function faceToPanel(
  face: { id: string; name: string; polygon: Point[] },
  partId: string,
): Panel {
  const outline = [...face.polygon]
  return {
    id: partId + ':' + face.id,
    partId,
    name: face.name,
    outline,
    bounds: getBounds(outline),
  }
}

function foldToFoldLine(
  fold: { id: string; edge: { start: Point; end: Point } },
  partId: string,
  entityPrefix: string,
): FoldLine {
  return {
    id: `${entityPrefix}:${fold.id}`,
    partId,
    start: fold.edge.start,
    end: fold.edge.end,
    foldType: 'score',
    style: 'dashed',
  }
}

function glueTabToTab(glueTab: { id: string; label?: string; polygon: Point[]; attachEdge: { start: Point; end: Point } }, partId: string): Tab {
  const bounds = getBounds(glueTab.polygon)
  return {
    id: `${partId}:${glueTab.id}`,
    partId,
    outline: [...glueTab.polygon],
    attachStart: glueTab.attachEdge.start,
    attachEnd: glueTab.attachEdge.end,
    widthMm: Math.min(bounds.width, bounds.height),
    label: glueTab.label ?? 'Glue Seam',
  }
}

function flapToTab(flap: { id: string; label: string; polygon: Point[]; attachEdge: { start: Point; end: Point } }, partId: string): Tab {
  const bounds = getBounds(flap.polygon)
  return {
    id: `${partId}:${flap.id}`,
    partId,
    outline: [...flap.polygon],
    attachStart: flap.attachEdge.start,
    attachEnd: flap.attachEdge.end,
    widthMm: Math.min(bounds.width, bounds.height),
    label: flap.label,
  }
}

export function netToTemplateItem(
  net: Net,
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const partId = createEntityId(context, 'part', 'main')
  const entityPrefix = context.itemId

  const panels: Panel[] = net.faces.map((face) => faceToPanel(face, partId))
  const tabs: Tab[] = [
    ...net.glueTabs.map((gt) => glueTabToTab(gt, partId)),
    ...net.flaps.map((flap) => flapToTab(flap, partId)),
  ]

  const cutPaths: CutPath[] = [
    ...panels.map((panel) => ({
      id: `${entityPrefix}:cut:panel-${panel.id}`,
      partId,
      path: [...panel.outline],
      style: 'solid' as const,
      closed: true,
    })),
    ...tabs.map((tab) => ({
      id: `${entityPrefix}:cut:tab-${tab.id}`,
      partId,
      path: [...tab.outline],
      style: 'solid' as const,
      closed: false,
    })),
  ]

  const foldLines: FoldLine[] = [
    ...net.folds.map((fold) => foldToFoldLine(fold, partId, entityPrefix)),
    ...tabs.map((tab) => ({
      id: `${entityPrefix}:fold:tab-${tab.id}`,
      partId,
      start: tab.attachStart,
      end: tab.attachEnd,
      foldType: 'score' as const,
      style: 'dashed' as const,
    })),
  ]

  const assemblyNote =
    input.style === 'glue-tab-carton'
      ? 'Glue the side seam first, then close the top and bottom flaps in sequence for a permanent carton build.'
      : 'Glue the side seam first, then use the tuck flaps and dust flaps to close the carton without additional adhesive.'

  return buildTemplateItem(input, context, panels, cutPaths, foldLines, tabs, assemblyNote)
}
