import type { Face, Flap, GlueTab, Net } from '../../geometry/net.ts'
import type { Point } from '../../geometry/index.ts'
import type { BoxInput } from './index.ts'
import { createHorizontalFlap, createTuckFlap, createVerticalGlueTab } from './index.ts'
import { layoutTemplate, labelToName, layoutOpenTrayTemplate, stripNetTemplate, crossNetTemplate, tLayoutNetTemplate, openTrayNetTemplate, type FlapSpec, type NetTemplate } from './net-templates.ts'

const GLUE_TAB_PERCENT = 0.18

function glueTabWidth(input: BoxInput): number {
  return input.glueTabWidthMm > 0
    ? input.glueTabWidthMm
    : Math.max(input.externalWidthMm * GLUE_TAB_PERCENT, 10)
}

function attachGlueTab(faces: Face[], input: BoxInput): GlueTab {
  const leftFace = faces.find((f) => f.name === 'Left Panel')!
  const glueWidth = glueTabWidth(input)
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

function flapLabel(spec: FlapSpec, style: BoxInput['style']): string {
  const faceName = spec.parentFace.charAt(0).toUpperCase() + spec.parentFace.slice(1)
  const prefix = spec.attachEdge === 'top' ? 'Top' : 'Bottom'
  const isSide = spec.parentFace === 'left' || spec.parentFace === 'right'
  if (isSide) return `${prefix} ${faceName} Dust Flap`
  if (style === 'glue-tab-carton') return `${prefix} ${faceName} Flap`
  const isTuck = (spec.parentFace === 'front' && spec.attachEdge === 'top') ||
                 (spec.parentFace === 'back' && spec.attachEdge === 'bottom')
  return isTuck ? `${prefix} Tuck Flap` : `${prefix} ${faceName} Flap`
}

function generateFlaps(template: NetTemplate, input: BoxInput, faces: Face[]): Flap[] {
  const { externalWidthMm: W, style } = input
  const sideFlapDepth = Math.max(W * 0.45, 14)
  const bottomFlapDepth = W * 0.78
  const frontMajorDepth = W * 0.85
  const backMajorDepth = W * 0.7
  const bottomSideDepth = Math.max(W * 0.42, 12)

  return template.flaps.map(spec => {
    const face = faces.find(f => f.name === labelToName(spec.parentFace))!
    const isTop = spec.attachEdge === 'top'
    const direction = isTop ? 'up' : 'down'
    const label = flapLabel(spec, style)

    if (style === 'glue-tab-carton') {
      const isSide = spec.parentFace === 'left' || spec.parentFace === 'right'
      const depth = isSide
        ? (isTop ? sideFlapDepth : bottomSideDepth)
        : (isTop ? frontMajorDepth : bottomFlapDepth)
      return buildFlap(spec.id, label, face, depth, direction, isSide ? 0.15 : 0)
    }

    const isTuck = (spec.parentFace === 'front' && isTop) || (spec.parentFace === 'back' && !isTop)
    if (isTuck) return buildTuckFlap(spec.id, label, face, frontMajorDepth, direction)

    if (spec.parentFace === 'front' || spec.parentFace === 'back') {
      return buildFlap(spec.id, label, face, backMajorDepth, direction, 0.06)
    }

    return buildFlap(spec.id, label, face, isTop ? sideFlapDepth : bottomSideDepth, direction, 0.18)
  })
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
  const { faces, folds } = layoutTemplate(stripNetTemplate, input)
  const glueTab = attachGlueTab(faces, input)
  const flaps = generateFlaps(stripNetTemplate, input, faces)

  return {
    id: 'net:strip',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge, angle: 180, direction: 'valley' }],
  }
}

export function buildCrossNet(input: BoxInput): Net {
  const { faces, folds } = layoutTemplate(crossNetTemplate, input)
  const glueTab = attachGlueTab(faces, input)
  const flaps = generateFlaps(crossNetTemplate, input, faces)

  return {
    id: 'net:cross',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge, angle: 180, direction: 'valley' }],
  }
}

export function buildTNetCarton(input: BoxInput): Net {
  const { faces, folds } = layoutTemplate(tLayoutNetTemplate, input)
  const leftFace = faces.find((f) => f.name === 'Left Panel')!
  const glueWidth = glueTabWidth(input)

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

  const flaps = generateFlaps(tLayoutNetTemplate, input, faces)

  return {
    id: 'net:t-layout',
    faces,
    glueTabs: [glueTab],
    flaps,
    folds: [...folds, { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'face:gluetab:seam', edge: glueTab.attachEdge, angle: 180, direction: 'valley' }],
  }
}

export function buildOpenTrayNet(input: BoxInput): Net {
  const { faces, folds } = layoutOpenTrayTemplate(openTrayNetTemplate, input)
  const L = input.externalLengthMm
  const H = input.externalHeightMm
  const W = input.externalWidthMm
  const gw = input.glueTabWidthMm

  const backFace = faces.find(f => f.name === 'Back Panel')!
  const frontFace = faces.find(f => f.name === 'Front Panel')!

  const glueTabs: GlueTab[] = [
    {
      id: 'gluetab:top-left',
      parentFaceId: backFace.id,
      attachEdge: { start: backFace.polygon[0]!, end: backFace.polygon[3]! },
      polygon: createVerticalGlueTab(0, -H, 0, 'left', gw),
      label: 'Tab A',
    },
    {
      id: 'gluetab:top-right',
      parentFaceId: backFace.id,
      attachEdge: { start: backFace.polygon[1]!, end: backFace.polygon[2]! },
      polygon: createVerticalGlueTab(L, -H, 0, 'right', gw),
      label: 'Tab B',
    },
    {
      id: 'gluetab:bottom-left',
      parentFaceId: frontFace.id,
      attachEdge: { start: frontFace.polygon[0]!, end: frontFace.polygon[3]! },
      polygon: createVerticalGlueTab(0, W, W + H, 'left', gw),
      label: 'Tab C',
    },
    {
      id: 'gluetab:bottom-right',
      parentFaceId: frontFace.id,
      attachEdge: { start: frontFace.polygon[1]!, end: frontFace.polygon[2]! },
      polygon: createVerticalGlueTab(L, W, W + H, 'right', gw),
      label: 'Tab D',
    },
  ]

  return {
    id: 'net:open-tray',
    faces,
    glueTabs,
    flaps: [],
    folds,
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
