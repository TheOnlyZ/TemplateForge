import type { Bounds, Point, Polygon } from '../geometry/index.ts'

export type EntityId = string
export type FoldType = 'mountain' | 'valley' | 'score'
export type LineStyle = 'solid' | 'dashed' | 'dotted'
export type AnnotationKind = 'dimension' | 'label' | 'instruction' | 'registration'
export type SplitKind = 'fold' | 'seam' | 'cut'
export type TemplateVersion = 1

export interface Panel {
  id: EntityId
  partId: EntityId
  name: string
  outline: Polygon
  bounds: Bounds
}

export interface CutPath {
  id: EntityId
  partId: EntityId
  path: Polygon
  style: LineStyle
  closed: boolean
}

export interface FoldLine {
  id: EntityId
  partId: EntityId
  start: Point
  end: Point
  foldType: FoldType
  style: LineStyle
}

export interface Tab {
  id: EntityId
  partId: EntityId
  outline: Polygon
  attachStart: Point
  attachEnd: Point
  widthMm: number
  label?: string
}

export interface JoinEdge {
  id: EntityId
  partId: EntityId
  start: Point
  end: Point
  label: string
  partnerId?: EntityId
}

export interface Annotation {
  id: EntityId
  kind: AnnotationKind
  text: string
  position: Point
  targetIds: EntityId[]
}

export interface SplitCandidate {
  id: EntityId
  partId: EntityId
  start: Point
  end: Point
  kind: SplitKind
  priority: number
  reason: string
}

export interface AssemblyNote {
  id: EntityId
  text: string
  step?: number
}

export interface TemplatePart {
  id: EntityId
  name: string
  panelIds: EntityId[]
  cutPathIds: EntityId[]
  foldLineIds: EntityId[]
  tabIds: EntityId[]
  joinEdgeIds: EntityId[]
  bounds: Bounds
}

export interface PagePlacement {
  id: EntityId
  pageNumber: number
  paperSizeId: string
  orientation: 'portrait' | 'landscape'
  printableBounds: Bounds
  partIds: EntityId[]
  joinEdgeIds: EntityId[]
}

export interface TemplatePartPlacement {
  partId: EntityId
  offsetX: number
  offsetY: number
  bounds: Bounds
}

export interface TemplateItem {
  id: EntityId
  version: TemplateVersion
  name: string
  shapeType: string
  dimensionsMm: Record<string, number>
  parts: TemplatePart[]
  panels: Panel[]
  cutPaths: CutPath[]
  foldLines: FoldLine[]
  tabs: Tab[]
  joinEdges: JoinEdge[]
  annotations: Annotation[]
  splitCandidates: SplitCandidate[]
  assemblyNotes: AssemblyNote[]
  pages: PagePlacement[]
  metadata: Record<string, string | number | boolean>
}
