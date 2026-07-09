import type { Point } from './index.ts'

export interface Face {
  id: string
  name: string
  widthMm: number
  heightMm: number
  polygon: Point[]
}

export interface Edge {
  start: Point
  end: Point
}

export interface GlueTab {
  id: string
  parentFaceId: string
  attachEdge: Edge
  polygon: Point[]
  label?: string
}

export interface Flap {
  id: string
  parentFaceId: string
  attachEdge: Edge
  polygon: Point[]
  label: string
}

export interface Fold {
  id: string
  faceAId: string
  faceBId: string
  edge: Edge
  angle: number
  direction: 'mountain' | 'valley'
}

export interface Net {
  id: string
  faces: Face[]
  glueTabs: GlueTab[]
  flaps: Flap[]
  folds: Fold[]
}
