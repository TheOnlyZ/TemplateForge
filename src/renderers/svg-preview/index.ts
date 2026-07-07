import { getBounds, type Point } from '../../domain/geometry/index.ts'
import type { Annotation, CutPath, FoldLine, Panel, Tab, TemplateItem } from '../../domain/templates/index.ts'

export interface PreviewPath {
  id: string
  d: string
  kind: 'panel' | 'cut' | 'fold' | 'tab'
}

export interface PreviewLabel {
  id: string
  text: string
  x: number
  y: number
}

export interface PreviewScene {
  viewBox: string
  width: number
  height: number
  panelPaths: PreviewPath[]
  cutPaths: PreviewPath[]
  foldPaths: PreviewPath[]
  tabPaths: PreviewPath[]
  labels: PreviewLabel[]
}

function pathToSvg(points: Point[], closePath: boolean) {
  if (points.length === 0) {
    return ''
  }

  const commands = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
  return `${commands.join(' ')}${closePath ? ' Z' : ''}`
}

function buildPanelPath(panel: Panel): PreviewPath {
  return {
    id: panel.id,
    d: pathToSvg(panel.outline, true),
    kind: 'panel',
  }
}

function buildCutPath(path: CutPath): PreviewPath {
  return {
    id: path.id,
    d: pathToSvg(path.path, path.closed),
    kind: 'cut',
  }
}

function buildFoldPath(line: FoldLine): PreviewPath {
  return {
    id: line.id,
    d: `M ${line.start.x} ${line.start.y} L ${line.end.x} ${line.end.y}`,
    kind: 'fold',
  }
}

function buildTabPath(tab: Tab): PreviewPath {
  return {
    id: tab.id,
    d: pathToSvg(tab.outline, false),
    kind: 'tab',
  }
}

function buildLabel(annotation: Annotation): PreviewLabel {
  return {
    id: annotation.id,
    text: annotation.text,
    x: annotation.position.x,
    y: annotation.position.y,
  }
}

export function renderTemplatePreview(template: TemplateItem): PreviewScene {
  const allPoints = [
    ...template.panels.flatMap((panel) => panel.outline),
    ...template.cutPaths.flatMap((path) => path.path),
    ...template.foldLines.flatMap((line) => [line.start, line.end]),
    ...template.tabs.flatMap((tab) => tab.outline),
  ]
  const bounds = getBounds(allPoints)
  const padding = 12
  const width = bounds.width + padding * 2
  const height = bounds.height + padding * 2

  return {
    viewBox: `${bounds.minX - padding} ${bounds.minY - padding} ${width} ${height}`,
    width,
    height,
    panelPaths: template.panels.map(buildPanelPath),
    cutPaths: template.cutPaths.map(buildCutPath),
    foldPaths: template.foldLines.map(buildFoldPath),
    tabPaths: template.tabs.map(buildTabPath),
    labels: template.annotations.map(buildLabel),
  }
}
