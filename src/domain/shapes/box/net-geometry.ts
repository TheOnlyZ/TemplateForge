import type { Face, Flap, Fold, GlueTab, Net } from '../../geometry/net.ts'
import type { Point } from '../../geometry/index.ts'
import type { BoxInput } from './index.ts'
import { createHorizontalFlap, createTuckFlap, createVerticalGlueTab } from './index.ts'

const GLUE_TAB_PERCENT = 0.18

function rect(x: number, y: number, w: number, h: number): Point[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
}

function createFace(
  id: string,
  name: string,
  widthMm: number,
  heightMm: number,
  poly: Point[],
): Face {
  return { id, name, widthMm, heightMm, polygon: poly }
}

function stripFaces(input: BoxInput): { faces: Face[]; folds: Fold[] } {
  const { externalLengthMm: L, externalWidthMm: W, externalHeightMm: H } = input

  const front = createFace('face:front', 'Front Panel', L, H, rect(0, 0, L, H))
  const right = createFace('face:right', 'Right Panel', W, H, rect(L, 0, W, H))
  const back = createFace('face:back', 'Back Panel', L, H, rect(L + W, 0, L, H))
  const left = createFace('face:left', 'Left Panel', W, H, rect(L + W + L, 0, W, H))
  const top = createFace('face:top', 'Top Panel', L, W, rect(0, -W, L, W))
  const bottom = createFace('face:bottom', 'Bottom Panel', L, W, rect(0, H, L, W))

  const folds: Fold[] = [
    { id: 'fold:front-right', faceAId: front.id, faceBId: right.id, edge: { start: { x: L, y: 0 }, end: { x: L, y: H } } },
    { id: 'fold:right-back', faceAId: right.id, faceBId: back.id, edge: { start: { x: L + W, y: 0 }, end: { x: L + W, y: H } } },
    { id: 'fold:back-left', faceAId: back.id, faceBId: left.id, edge: { start: { x: L + W + L, y: 0 }, end: { x: L + W + L, y: H } } },
    { id: 'fold:front-top', faceAId: front.id, faceBId: top.id, edge: { start: { x: 0, y: 0 }, end: { x: L, y: 0 } } },
    { id: 'fold:front-bottom', faceAId: front.id, faceBId: bottom.id, edge: { start: { x: 0, y: H }, end: { x: L, y: H } } },
  ]

  return { faces: [front, right, back, left, top, bottom], folds }
}

function crossFaces(input: BoxInput): { faces: Face[]; folds: Fold[] } {
  const { externalLengthMm: L, externalWidthMm: W, externalHeightMm: H } = input

  const left = createFace('face:left', 'Left Panel', W, H, rect(0, 0, W, H))
  const front = createFace('face:front', 'Front Panel', L, H, rect(W, 0, L, H))
  const right = createFace('face:right', 'Right Panel', W, H, rect(W + L, 0, W, H))
  const back = createFace('face:back', 'Back Panel', L, H, rect(W + L + W, 0, L, H))
  const top = createFace('face:top', 'Top Panel', L, W, rect(W, -W, L, W))
  const bottom = createFace('face:bottom', 'Bottom Panel', L, W, rect(W, H, L, W))

  const folds: Fold[] = [
    { id: 'fold:left-front', faceAId: left.id, faceBId: front.id, edge: { start: { x: W, y: 0 }, end: { x: W, y: H } } },
    { id: 'fold:front-right', faceAId: front.id, faceBId: right.id, edge: { start: { x: W + L, y: 0 }, end: { x: W + L, y: H } } },
    { id: 'fold:right-back', faceAId: right.id, faceBId: back.id, edge: { start: { x: W + L + W, y: 0 }, end: { x: W + L + W, y: H } } },
    { id: 'fold:front-top', faceAId: front.id, faceBId: top.id, edge: { start: { x: W, y: 0 }, end: { x: W + L, y: 0 } } },
    { id: 'fold:front-bottom', faceAId: front.id, faceBId: bottom.id, edge: { start: { x: W, y: H }, end: { x: W + L, y: H } } },
  ]

  return { faces: [left, front, right, back, top, bottom], folds }
}

function tFaces(input: BoxInput): { faces: Face[]; folds: Fold[] } {
  const { externalLengthMm: L, externalWidthMm: W, externalHeightMm: H } = input

  const front = createFace('face:front', 'Front Panel', L, H, rect(W, W, L, H))
  const left = createFace('face:left', 'Left Panel', W, H, rect(0, W, W, H))
  const right = createFace('face:right', 'Right Panel', W, H, rect(W + L, W, W, H))
  const top = createFace('face:top', 'Top Panel', L, W, rect(W, 0, L, W))
  const back = createFace('face:back', 'Back Panel', L, H, rect(W, W + H, L, H))
  const bottom = createFace('face:bottom', 'Bottom Panel', L, W, rect(W, W + H + H, L, W))

  const folds: Fold[] = [
    { id: 'fold:left-front', faceAId: left.id, faceBId: front.id, edge: { start: { x: W, y: W }, end: { x: W, y: W + H } } },
    { id: 'fold:front-right', faceAId: front.id, faceBId: right.id, edge: { start: { x: W + L, y: W }, end: { x: W + L, y: W + H } } },
    { id: 'fold:front-top', faceAId: front.id, faceBId: top.id, edge: { start: { x: W, y: W }, end: { x: W + L, y: W } } },
    { id: 'fold:front-back', faceAId: front.id, faceBId: back.id, edge: { start: { x: W, y: W + H }, end: { x: W + L, y: W + H } } },
    { id: 'fold:back-bottom', faceAId: back.id, faceBId: bottom.id, edge: { start: { x: W, y: W + H + H }, end: { x: W + L, y: W + H + H } } },
  ]

  return { faces: [left, front, right, top, back, bottom], folds }
}

function attachGlueTab(faces: Face[]): GlueTab {
  const leftFace = faces.find((f) => f.name === 'Left Panel')!
  const { externalWidthMm: W } = findDimensions(leftFace)
  const glueWidth = Math.max(W * GLUE_TAB_PERCENT, 10)
  const poly = createVerticalGlueTab(
    leftFace.polygon[2]!.x,
    leftFace.polygon[0]!.y,
    leftFace.polygon[3]!.y,
    'right',
    glueWidth,
  )

  return {
    id: 'gluetab:seam',
    parentFaceId: leftFace.id,
    attachEdge: {
      start: poly[0]!,
      end: poly[3]!,
    },
    polygon: poly,
  }
}

function findDimensions(face: Face): { externalLengthMm: number; externalWidthMm: number; externalHeightMm: number } {
  const w = face.widthMm
  const h = face.heightMm
  return { externalLengthMm: Math.max(w, h), externalWidthMm: Math.min(w, h), externalHeightMm: 0 }
}

function isWidthOrHeightPanel(face: Face): boolean {
  return face.name === 'Left Panel' || face.name === 'Right Panel'
}

function buildClosureFlaps(input: BoxInput, faces: Face[], topEdgeY: number, bottomEdgeY: number): Flap[] {
  const { externalWidthMm: W, style } = input
  const frontFace = faces.find((f) => f.name === 'Front Panel')!
  const rightFace = faces.find((f) => f.name === 'Right Panel')!
  const backFace = faces.find((f) => f.name === 'Back Panel')!
  const leftFace = faces.find((f) => f.name === 'Left Panel')!

  const sideFlapDepth = Math.max(W * 0.45, 14)
  const bottomFlapDepth = W * 0.78
  const frontMajorDepth = W * 0.85
  const backMajorDepth = W * 0.7
  const bottomSideDepth = Math.max(W * 0.42, 12)

  const flaps: Flap[] = []

  if (style === 'glue-tab-carton') {
    flaps.push(
      buildFlap('flap:top-front', 'Top Front Flap', frontFace, frontMajorDepth, 'up', 0),
      buildFlap('flap:top-right', 'Top Right Dust Flap', rightFace, sideFlapDepth, 'up', 0.15),
      buildFlap('flap:top-back', 'Top Back Flap', backFace, frontMajorDepth, 'up', 0),
      buildFlap('flap:top-left', 'Top Left Dust Flap', leftFace, sideFlapDepth, 'up', 0.15),
      buildFlap('flap:bottom-front', 'Bottom Front Flap', frontFace, bottomFlapDepth, 'down', 0),
      buildFlap('flap:bottom-right', 'Bottom Right Dust Flap', rightFace, bottomSideDepth, 'down', 0.15),
      buildFlap('flap:bottom-back', 'Bottom Back Flap', backFace, bottomFlapDepth, 'down', 0),
      buildFlap('flap:bottom-left', 'Bottom Left Dust Flap', leftFace, bottomSideDepth, 'down', 0.15),
    )
  } else {
    flaps.push(
      buildTuckFlap('flap:top-front', 'Top Tuck Flap', frontFace, frontMajorDepth, 'up'),
      buildFlap('flap:top-right', 'Top Right Dust Flap', rightFace, sideFlapDepth, 'up', 0.18),
      buildFlap('flap:top-back', 'Top Back Flap', backFace, backMajorDepth, 'up', 0.06),
      buildFlap('flap:top-left', 'Top Left Dust Flap', leftFace, sideFlapDepth, 'up', 0.18),
      buildFlap('flap:bottom-front', 'Bottom Front Flap', frontFace, backMajorDepth, 'down', 0.06),
      buildFlap('flap:bottom-right', 'Bottom Right Dust Flap', rightFace, bottomSideDepth, 'down', 0.18),
      buildTuckFlap('flap:bottom-back', 'Bottom Tuck Flap', backFace, frontMajorDepth, 'down'),
      buildFlap('flap:bottom-left', 'Bottom Left Dust Flap', leftFace, bottomSideDepth, 'down', 0.18),
    )
  }

  return flaps
}

function getFlapAttachEdge(face: Face, direction: 'up' | 'down'): { start: Point; end: Point } {
  if (direction === 'up') {
    return { start: face.polygon[0]!, end: face.polygon[1]! }
  }
  return { start: face.polygon[3]!, end: face.polygon[2]! }
}

function buildFlap(
  id: string,
  label: string,
  face: Face,
  depth: number,
  direction: 'up' | 'down',
  taper: number,
): Flap {
  const poly = createHorizontalFlap(
    face.polygon[0]!.x,
    face.polygon[1]!.x,
    direction === 'up' ? face.polygon[0]!.y : face.polygon[3]!.y,
    depth,
    direction,
    taper,
  )

  return {
    id,
    label,
    parentFaceId: face.id,
    attachEdge: getFlapAttachEdge(face, direction),
    polygon: poly,
  }
}

function buildTuckFlap(id: string, label: string, face: Face, depth: number, direction: 'up' | 'down'): Flap {
  const attachY = direction === 'up' ? face.polygon[0]!.y : face.polygon[3]!.y
  const poly = createTuckFlap(face.polygon[0]!.x, face.polygon[1]!.x, attachY, depth, direction)

  return {
    id,
    label,
    parentFaceId: face.id,
    attachEdge: getFlapAttachEdge(face, direction),
    polygon: poly,
  }
}

export function buildStripNet(input: BoxInput): Net {
  const { faces, folds } = stripFaces(input)
  const glueTab = attachGlueTab(faces)
  const flaps = buildClosureFlaps(input, faces, faces[0]!.polygon[0]!.y, faces[0]!.polygon[2]!.y)

  return {
    id: 'net:strip',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge }],
  }
}

export function buildCrossNet(input: BoxInput): Net {
  const { faces, folds } = crossFaces(input)
  const glueTab = attachGlueTab(faces)
  const flaps = buildClosureFlaps(input, faces, faces[0]!.polygon[0]!.y, faces[0]!.polygon[2]!.y)

  return {
    id: 'net:cross',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge }],
  }
}

export function buildTNetCarton(input: BoxInput): Net {
  const { folds, faces } = tFaces(input)
  const leftFace = faces.find((f) => f.name === 'Left Panel')!
  const frontFace = faces.find((f) => f.name === 'Front Panel')!
  const { externalWidthMm: W } = findDimensions(leftFace)
  const glueWidth = Math.max(W * GLUE_TAB_PERCENT, 10)

  const glueTab: GlueTab = {
    id: 'gluetab:seam',
    parentFaceId: leftFace.id,
    attachEdge: {
      start: { x: leftFace.polygon[2]!.x, y: leftFace.polygon[0]!.y },
      end: { x: leftFace.polygon[2]!.x, y: leftFace.polygon[3]!.y },
    },
    polygon: createVerticalGlueTab(
      leftFace.polygon[2]!.x,
      leftFace.polygon[0]!.y,
      leftFace.polygon[3]!.y,
      'right',
      glueWidth,
    ),
  }

  const topEdgeY = frontFace.polygon[0]!.y
  const bottomEdgeY = frontFace.polygon[3]!.y
  const flaps = buildClosureFlaps(input, faces, topEdgeY, bottomEdgeY)

  return {
    id: 'net:t-layout',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge }],
  }
}

export type NetGenerator = (input: BoxInput) => Net

export function getNetGenerator(netType: 'strip' | 'cross' | 't-layout'): NetGenerator {
  switch (netType) {
    case 'cross':
      return buildCrossNet
    case 't-layout':
      return buildTNetCarton
    default:
      return buildStripNet
  }
}
