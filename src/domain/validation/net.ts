import type { Net } from '../geometry/net.ts'
import type { BoxInput } from '../shapes/box/index.ts'
import type { ValidationMessage, ValidationResult } from './index.ts'

const VALID_FACE_NAMES = new Set([
  'Front Panel',
  'Back Panel',
  'Left Panel',
  'Right Panel',
  'Top Panel',
  'Bottom Panel',
])

function faceLabelParts(name: string): { role: string; label: string } {
  const parts = name.split(' ')
  const label = parts.slice(0, -1).join(' ')
  return { role: parts[parts.length - 1] ?? '', label }
}

function expectFaceDimensions(
  name: string,
): { widthDim: 'externalLengthMm' | 'externalWidthMm'; heightDim: 'externalHeightMm' | 'externalWidthMm' } | null {
  const { role } = faceLabelParts(name)
  switch (role) {
    case 'Panel':
      switch (true) {
        case name.startsWith('Front') || name.startsWith('Back'):
          return { widthDim: 'externalLengthMm', heightDim: 'externalHeightMm' }
        case name.startsWith('Left') || name.startsWith('Right'):
          return { widthDim: 'externalWidthMm', heightDim: 'externalHeightMm' }
        case name.startsWith('Top') || name.startsWith('Bottom'):
          return { widthDim: 'externalLengthMm', heightDim: 'externalWidthMm' }
        default:
          return null
      }
    default:
      return null
  }
}

function buildResult(messages: ValidationMessage[]): ValidationResult {
  return {
    valid: !messages.some((m) => m.severity === 'error'),
    messages,
  }
}

export function validateNet(net: Net, input: BoxInput): ValidationResult {
  const messages: ValidationMessage[] = []

  validateFaceCount(net, input, messages)
  validateFaceDimensions(net, input, messages)
  validateFaceNames(net, messages)
  validateGlueTabAttachment(net, messages)
  validateGlueTabOverlap(net, messages)
  validateFoldGraph(net, messages)
  validateFoldConnections(net, messages)

  return buildResult(messages)
}

function validateFaceCount(net: Net, input: BoxInput, messages: ValidationMessage[]) {
  const expected = input.style === 'open-tray' ? 5 : 6

  if (net.faces.length !== expected) {
    messages.push({
      code: 'net-face-count',
      severity: 'warning',
      message: `Expected ${expected} faces for ${input.style} but got ${net.faces.length}.`,
    })
  }
}

function validateFaceDimensions(net: Net, input: BoxInput, messages: ValidationMessage[]) {
  for (const face of net.faces) {
    if (face.widthMm <= 0 || face.heightMm <= 0) {
      messages.push({
        code: 'net-face-dimension',
        severity: 'warning',
        targetId: face.id,
        message: `Face "${face.name}" has non-positive dimensions (${face.widthMm} × ${face.heightMm} mm).`,
      })
      continue
    }

    const expected = expectFaceDimensions(face.name)

    if (expected === null) {
      continue
    }

    const expectedWidth = input[expected.widthDim]
    const expectedHeight = input[expected.heightDim]
    const tol = 0.01

    if (Math.abs(face.widthMm - expectedWidth) > tol || Math.abs(face.heightMm - expectedHeight) > tol) {
      messages.push({
        code: 'net-face-dimension',
        severity: 'warning',
        targetId: face.id,
        message: `Face "${face.name}" dimensions (${face.widthMm} × ${face.heightMm} mm) do not match expected (${expectedWidth} × ${expectedHeight} mm).`,
      })
    }
  }
}

function validateFaceNames(net: Net, messages: ValidationMessage[]) {
  const seen = new Set<string>()

  for (const face of net.faces) {
    if (!VALID_FACE_NAMES.has(face.name)) {
      messages.push({
        code: 'net-face-name',
        severity: 'warning',
        targetId: face.id,
        message: `Face "${face.name}" does not follow the expected naming convention (one of: ${[...VALID_FACE_NAMES].join(', ')}).`,
      })
    }

    if (seen.has(face.name)) {
      messages.push({
        code: 'net-face-duplicate',
        severity: 'warning',
        targetId: face.id,
        message: `Duplicate face name "${face.name}".`,
      })
    }

    seen.add(face.name)
  }
}

function validateGlueTabAttachment(net: Net, messages: ValidationMessage[]) {
  for (const gt of net.glueTabs) {
    const parentFace = net.faces.find((f) => f.id === gt.parentFaceId)

    if (!parentFace) {
      messages.push({
        code: 'net-glue-tab-attachment',
        severity: 'warning',
        targetId: gt.id,
        message: `Glue tab "${gt.id}" references non-existent parent face "${gt.parentFaceId}".`,
      })
      continue
    }

    const attachEdge = gt.attachEdge
    const parentPoly = parentFace.polygon
    const edgeCount = parentPoly.length

    let attached = false

    for (let i = 0; i < edgeCount; i++) {
      const edgeStart = parentPoly[i]!
      const edgeEnd = parentPoly[(i + 1) % edgeCount]!

      const startOnEdge = pointOnSegment(attachEdge.start, edgeStart, edgeEnd)
      const endOnEdge = pointOnSegment(attachEdge.end, edgeStart, edgeEnd)

      if (startOnEdge && endOnEdge) {
        attached = true
        break
      }
    }

    if (!attached) {
      messages.push({
        code: 'net-glue-tab-attachment',
        severity: 'warning',
        targetId: gt.id,
        message: `Glue tab "${gt.id}" attach edge does not lie on any edge of parent face "${parentFace.name}".`,
      })
    }
  }
}

function validateGlueTabOverlap(net: Net, messages: ValidationMessage[]) {
  for (const gt of net.glueTabs) {
    for (const face of net.faces) {
      if (gt.parentFaceId === face.id) {
        continue
      }

      const tabPoly = gt.polygon
      const facePoly = face.polygon

      if (polygonsOverlap(tabPoly, facePoly)) {
        messages.push({
          code: 'net-glue-tab-overlap',
          severity: 'warning',
          targetId: gt.id,
          message: `Glue tab "${gt.id}" overlaps with face "${face.name}".`,
        })
      }
    }
  }
}

function validateFoldGraph(net: Net, messages: ValidationMessage[]) {
  if (net.faces.length === 0) {
    return
  }

  const faceIds = new Set(net.faces.map((f) => f.id))
  const adjacency = new Map<string, Set<string>>()

  for (const face of net.faces) {
    adjacency.set(face.id, new Set())
  }

  for (const fold of net.folds) {
    if (!faceIds.has(fold.faceAId) || !faceIds.has(fold.faceBId)) {
      continue
    }

    const neighborsA = adjacency.get(fold.faceAId)

    if (neighborsA) {
      neighborsA.add(fold.faceBId)
    }

    const neighborsB = adjacency.get(fold.faceBId)

    if (neighborsB) {
      neighborsB.add(fold.faceAId)
    }
  }

  const visited = new Set<string>()
  const queue = [net.faces[0]!.id]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (visited.has(current)) {
      continue
    }

    visited.add(current)
    const neighbors = adjacency.get(current)

    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor)
        }
      }
    }
  }

  if (visited.size !== net.faces.length) {
    const unvisited = net.faces.filter((f) => !visited.has(f.id)).map((f) => f.name)
    messages.push({
      code: 'net-fold-graph',
      severity: 'warning',
      message: `Fold graph is not connected. Unreachable faces: ${unvisited.join(', ')}.`,
    })
  }
}

function validateFoldConnections(net: Net, messages: ValidationMessage[]) {
  for (const fold of net.folds) {
    if (fold.faceAId === fold.faceBId) {
      messages.push({
        code: 'net-fold-connection',
        severity: 'warning',
        targetId: fold.id,
        message: `Fold "${fold.id}" connects a face to itself.`,
      })
    }

    const faceAExists = net.faces.some((f) => f.id === fold.faceAId)
    const faceBExists = net.faces.some((f) => f.id === fold.faceBId)

    if (!faceAExists && !faceBExists) {
      messages.push({
        code: 'net-fold-connection',
        severity: 'warning',
        targetId: fold.id,
        message: `Fold "${fold.id}" does not connect to any face.`,
      })
    }
  }
}

function pointOnSegment(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  const cross = Math.abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x))
  if (cross > 0.01) {
    return false
  }

  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)
  if (dot < 0) {
    return false
  }

  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  if (dot > lenSq) {
    return false
  }

  return true
}

function polygonsOverlap(polyA: { x: number; y: number }[], polyB: { x: number; y: number }[]): boolean {
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i]!
    const a2 = polyA[(i + 1) % polyA.length]!

    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j]!
      const b2 = polyB[(j + 1) % polyB.length]!

      if (segmentsIntersect(a1, a2, b1, b2)) {
        return true
      }
    }
  }

  return false
}

function segmentsIntersect(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number },
): boolean {
  const d1x = a2.x - a1.x
  const d1y = a2.y - a1.y
  const d2x = b2.x - b1.x
  const d2y = b2.y - b1.y
  const rxs = (b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x

  if (Math.abs(d1x * d2y - d1y * d2x) < 1e-10) {
    return false
  }

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / (d1x * d2y - d1y * d2x)
  const u = rxs / (d1x * d2y - d1y * d2x)

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}
