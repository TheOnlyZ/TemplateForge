import type { Face, Fold, Edge } from '../../geometry/net.ts'
import type { Point } from '../../geometry/index.ts'
import type { BoxInput } from './index.ts'

export type FaceLabel = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom'
export type FaceEdge = 'top' | 'bottom' | 'left' | 'right'

export interface Connection {
  faceA: FaceLabel
  edgeA: FaceEdge
  faceB: FaceLabel
  edgeB: FaceEdge
  angle: number
  direction: 'mountain' | 'valley'
}

export interface FlapSpec {
  id: string
  label: string
  parentFace: FaceLabel
  attachEdge: FaceEdge
}

export interface NetTemplate {
  id: string
  root: FaceLabel
  connections: Connection[]
  flaps: FlapSpec[]
}

function faceDims(label: FaceLabel, input: BoxInput): { w: number; h: number } {
  const { externalLengthMm: L, externalWidthMm: W, externalHeightMm: H } = input
  switch (label) {
    case 'front': case 'back': return { w: L, h: H }
    case 'left': case 'right': return { w: W, h: H }
    case 'top': case 'bottom': return { w: L, h: W }
  }
}

export function labelToName(label: FaceLabel): string {
  const s = label === 'front' ? 'Front' : label === 'back' ? 'Back' : label === 'left' ? 'Left' : label === 'right' ? 'Right' : label === 'top' ? 'Top' : 'Bottom'
  return `${s} Panel`
}

function rect(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

function edgeForFace(pos: { x: number; y: number }, dims: { w: number; h: number }, edge: FaceEdge): Edge {
  switch (edge) {
    case 'right':
      return { start: { x: pos.x + dims.w, y: pos.y }, end: { x: pos.x + dims.w, y: pos.y + dims.h } }
    case 'left':
      return { start: { x: pos.x, y: pos.y }, end: { x: pos.x, y: pos.y + dims.h } }
    case 'top':
      return { start: { x: pos.x, y: pos.y }, end: { x: pos.x + dims.w, y: pos.y } }
    case 'bottom':
      return { start: { x: pos.x, y: pos.y + dims.h }, end: { x: pos.x + dims.w, y: pos.y + dims.h } }
  }
}

const ALL_LABELS: FaceLabel[] = ['front', 'back', 'left', 'right', 'top', 'bottom']

export const stripNetTemplate: NetTemplate = {
  id: 'strip',
  root: 'front',
  connections: [
    { faceA: 'front', edgeA: 'right', faceB: 'right', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'right', edgeA: 'right', faceB: 'back', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'back', edgeA: 'right', faceB: 'left', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'top', faceB: 'top', edgeB: 'bottom', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'bottom', faceB: 'bottom', edgeB: 'top', angle: 90, direction: 'mountain' },
  ],
  flaps: [
    { id: 'flap:top-right', label: 'Top Right Dust Flap', parentFace: 'right', attachEdge: 'top' },
    { id: 'flap:top-back', label: 'Top Back Flap', parentFace: 'back', attachEdge: 'top' },
    { id: 'flap:top-left', label: 'Top Left Dust Flap', parentFace: 'left', attachEdge: 'top' },
    { id: 'flap:bottom-right', label: 'Bottom Right Dust Flap', parentFace: 'right', attachEdge: 'bottom' },
    { id: 'flap:bottom-back', label: 'Bottom Back Flap', parentFace: 'back', attachEdge: 'bottom' },
    { id: 'flap:bottom-left', label: 'Bottom Left Dust Flap', parentFace: 'left', attachEdge: 'bottom' },
  ],
}

export const crossNetTemplate: NetTemplate = {
  id: 'cross',
  root: 'front',
  connections: [
    { faceA: 'left', edgeA: 'right', faceB: 'front', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'right', faceB: 'right', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'right', edgeA: 'right', faceB: 'back', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'top', faceB: 'top', edgeB: 'bottom', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'bottom', faceB: 'bottom', edgeB: 'top', angle: 90, direction: 'mountain' },
  ],
  flaps: [
    { id: 'flap:top-left', label: 'Top Left Dust Flap', parentFace: 'left', attachEdge: 'top' },
    { id: 'flap:top-right', label: 'Top Right Dust Flap', parentFace: 'right', attachEdge: 'top' },
    { id: 'flap:top-back', label: 'Top Back Flap', parentFace: 'back', attachEdge: 'top' },
    { id: 'flap:bottom-left', label: 'Bottom Left Dust Flap', parentFace: 'left', attachEdge: 'bottom' },
    { id: 'flap:bottom-right', label: 'Bottom Right Dust Flap', parentFace: 'right', attachEdge: 'bottom' },
    { id: 'flap:bottom-back', label: 'Bottom Back Flap', parentFace: 'back', attachEdge: 'bottom' },
  ],
}

export const tLayoutNetTemplate: NetTemplate = {
  id: 't-layout',
  root: 'front',
  connections: [
    { faceA: 'left', edgeA: 'right', faceB: 'front', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'right', faceB: 'right', edgeB: 'left', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'top', faceB: 'top', edgeB: 'bottom', angle: 90, direction: 'mountain' },
    { faceA: 'front', edgeA: 'bottom', faceB: 'back', edgeB: 'top', angle: 90, direction: 'mountain' },
    { faceA: 'back', edgeA: 'bottom', faceB: 'bottom', edgeB: 'top', angle: 90, direction: 'mountain' },
  ],
  flaps: [
    { id: 'flap:top-left', label: 'Top Left Dust Flap', parentFace: 'left', attachEdge: 'top' },
    { id: 'flap:top-right', label: 'Top Right Dust Flap', parentFace: 'right', attachEdge: 'top' },
    { id: 'flap:bottom-left', label: 'Bottom Left Dust Flap', parentFace: 'left', attachEdge: 'bottom' },
    { id: 'flap:bottom-right', label: 'Bottom Right Dust Flap', parentFace: 'right', attachEdge: 'bottom' },
  ],
}

const TRAY_LABELS: FaceLabel[] = ['bottom', 'front', 'back', 'left', 'right']

export const openTrayNetTemplate: NetTemplate = {
  id: 'open-tray',
  root: 'bottom',
  connections: [
    { faceA: 'bottom', edgeA: 'top', faceB: 'back', edgeB: 'bottom', angle: 90, direction: 'mountain' },
    { faceA: 'bottom', edgeA: 'bottom', faceB: 'front', edgeB: 'top', angle: 90, direction: 'mountain' },
    { faceA: 'bottom', edgeA: 'left', faceB: 'left', edgeB: 'right', angle: 90, direction: 'mountain' },
    { faceA: 'bottom', edgeA: 'right', faceB: 'right', edgeB: 'left', angle: 90, direction: 'mountain' },
  ],
  flaps: [],
}

function trayFaceDims(label: FaceLabel, input: BoxInput): { w: number; h: number } {
  const { externalLengthMm: L, externalWidthMm: W, externalHeightMm: H } = input
  switch (label) {
    case 'front': case 'back': return { w: L, h: H }
    case 'left': case 'right': return { w: H, h: W }
    default: return { w: L, h: W }
  }
}

export function layoutOpenTrayTemplate(template: NetTemplate, input: BoxInput): { faces: Face[]; folds: Fold[] } {
  const dims = new Map<FaceLabel, { w: number; h: number }>()
  const pos = new Map<FaceLabel, { x: number; y: number }>()
  const placed = new Set<FaceLabel>()

  for (const label of TRAY_LABELS) {
    dims.set(label, trayFaceDims(label, input))
  }

  pos.set(template.root, { x: 0, y: 0 })
  placed.add(template.root)

  const folds: Fold[] = []

  const queue: FaceLabel[] = [template.root]
  while (queue.length > 0) {
    const current = queue.shift()!
    const currentPos = pos.get(current)!
    const currentDims = dims.get(current)!

    for (const conn of template.connections) {
      let neighbor: FaceLabel
      let currentEdge: FaceEdge
      let neighborEdge: FaceEdge

      if (conn.faceA === current && !placed.has(conn.faceB)) {
        neighbor = conn.faceB
        currentEdge = conn.edgeA
        neighborEdge = conn.edgeB
      } else if (conn.faceB === current && !placed.has(conn.faceA)) {
        neighbor = conn.faceA
        currentEdge = conn.edgeB
        neighborEdge = conn.edgeA
      } else {
        continue
      }

      const neighborDims = dims.get(neighbor)!
      let nx: number
      let ny: number

      if (currentEdge === 'right' && neighborEdge === 'left') {
        nx = currentPos.x + currentDims.w
        ny = currentPos.y
      } else if (currentEdge === 'left' && neighborEdge === 'right') {
        nx = currentPos.x - neighborDims.w
        ny = currentPos.y
      } else if (currentEdge === 'top' && neighborEdge === 'bottom') {
        nx = currentPos.x
        ny = currentPos.y - neighborDims.h
      } else {
        nx = currentPos.x
        ny = currentPos.y + currentDims.h
      }

      pos.set(neighbor, { x: nx, y: ny })
      placed.add(neighbor)
      queue.push(neighbor)

      folds.push({
        id: `fold:${conn.faceA}-${conn.faceB}`,
        faceAId: `face:${conn.faceA}`,
        faceBId: `face:${conn.faceB}`,
        edge: edgeForFace(currentPos, currentDims, currentEdge),
        angle: conn.angle,
        direction: conn.direction,
      })
    }
  }

  const faces: Face[] = TRAY_LABELS.map((label) => {
    const p = pos.get(label)!
    const d = dims.get(label)!
    return {
      id: `face:${label}`,
      name: labelToName(label),
      widthMm: d.w,
      heightMm: d.h,
      polygon: rect(p.x, p.y, d.w, d.h),
    }
  })

  return { faces, folds }
}

export function layoutTemplate(template: NetTemplate, input: BoxInput): { faces: Face[]; folds: Fold[] } {
  const dims = new Map<FaceLabel, { w: number; h: number }>()
  const pos = new Map<FaceLabel, { x: number; y: number }>()
  const placed = new Set<FaceLabel>()

  for (const label of ALL_LABELS) {
    dims.set(label, faceDims(label, input))
  }

  pos.set(template.root, { x: 0, y: 0 })
  placed.add(template.root)

  const folds: Fold[] = []

  const queue: FaceLabel[] = [template.root]
  while (queue.length > 0) {
    const current = queue.shift()!
    const currentPos = pos.get(current)!
    const currentDims = dims.get(current)!

    for (const conn of template.connections) {
      let neighbor: FaceLabel
      let currentEdge: FaceEdge
      let neighborEdge: FaceEdge

      if (conn.faceA === current && !placed.has(conn.faceB)) {
        neighbor = conn.faceB
        currentEdge = conn.edgeA
        neighborEdge = conn.edgeB
      } else if (conn.faceB === current && !placed.has(conn.faceA)) {
        neighbor = conn.faceA
        currentEdge = conn.edgeB
        neighborEdge = conn.edgeA
      } else {
        continue
      }

      const neighborDims = dims.get(neighbor)!
      let nx: number
      let ny: number

      if (currentEdge === 'right' && neighborEdge === 'left') {
        nx = currentPos.x + currentDims.w
        ny = currentPos.y
      } else if (currentEdge === 'left' && neighborEdge === 'right') {
        nx = currentPos.x - neighborDims.w
        ny = currentPos.y
      } else if (currentEdge === 'top' && neighborEdge === 'bottom') {
        nx = currentPos.x
        ny = currentPos.y - neighborDims.h
      } else {
        nx = currentPos.x
        ny = currentPos.y + currentDims.h
      }

      pos.set(neighbor, { x: nx, y: ny })
      placed.add(neighbor)
      queue.push(neighbor)

      folds.push({
        id: `fold:${conn.faceA}-${conn.faceB}`,
        faceAId: `face:${conn.faceA}`,
        faceBId: `face:${conn.faceB}`,
        edge: edgeForFace(currentPos, currentDims, currentEdge),
        angle: conn.angle,
        direction: conn.direction,
      })
    }
  }

  const faces: Face[] = ALL_LABELS.map((label) => {
    const p = pos.get(label)!
    const d = dims.get(label)!
    return {
      id: `face:${label}`,
      name: labelToName(label),
      widthMm: d.w,
      heightMm: d.h,
      polygon: rect(p.x, p.y, d.w, d.h),
    }
  })

  return { faces, folds }
}
