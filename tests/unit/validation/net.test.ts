import { describe, expect, it } from 'vitest'
import { validateNet } from '../../../src/domain/validation/index.ts'
import type { Net, Face, GlueTab, Fold } from '../../../src/domain/geometry/net.ts'
import type { BoxInput } from '../../../src/domain/shapes/box/index.ts'

const input: BoxInput = {
  externalLengthMm: 100,
  externalWidthMm: 60,
  externalHeightMm: 40,
  glueTabWidthMm: 12,
  style: 'glue-tab-carton',
}

function createFakeNet(overrides?: Partial<Net>): Net {
  const L = 100
  const W = 60
  const H = 40
  const x0 = L + W + L
  const x1 = x0 + W
  const stripY = 60

  const faces: Face[] = [
    { id: 'face:front', name: 'Front Panel', widthMm: L, heightMm: H, polygon: [{ x: 0, y: stripY }, { x: L, y: stripY }, { x: L, y: stripY + H }, { x: 0, y: stripY + H }] },
    { id: 'face:back', name: 'Back Panel', widthMm: L, heightMm: H, polygon: [{ x: L + W, y: stripY }, { x: L + W + L, y: stripY }, { x: L + W + L, y: stripY + H }, { x: L + W, y: stripY + H }] },
    { id: 'face:left', name: 'Left Panel', widthMm: W, heightMm: H, polygon: [{ x: x0, y: stripY }, { x: x1, y: stripY }, { x: x1, y: stripY + H }, { x: x0, y: stripY + H }] },
    { id: 'face:right', name: 'Right Panel', widthMm: W, heightMm: H, polygon: [{ x: L, y: stripY }, { x: L + W, y: stripY }, { x: L + W, y: stripY + H }, { x: L, y: stripY + H }] },
    { id: 'face:top', name: 'Top Panel', widthMm: L, heightMm: W, polygon: [{ x: 0, y: stripY - W }, { x: L, y: stripY - W }, { x: L, y: stripY }, { x: 0, y: stripY }] },
    { id: 'face:bottom', name: 'Bottom Panel', widthMm: L, heightMm: W, polygon: [{ x: 0, y: stripY + H }, { x: L, y: stripY + H }, { x: L, y: stripY + H + W }, { x: 0, y: stripY + H + W }] },
  ]

  const glueTabs: GlueTab[] = [{
    id: 'gluetab:seam',
    parentFaceId: 'face:left',
    attachEdge: { start: { x: x1, y: stripY }, end: { x: x1, y: stripY + H } },
    polygon: [{ x: x1, y: stripY }, { x: x1 + 12, y: stripY + 5 }, { x: x1 + 12, y: stripY + H - 5 }, { x: x1, y: stripY + H }],
  }]

  const folds: Fold[] = [
    { id: 'fold:front-right', faceAId: 'face:front', faceBId: 'face:right', edge: { start: { x: L, y: stripY }, end: { x: L, y: stripY + H } } },
    { id: 'fold:right-back', faceAId: 'face:right', faceBId: 'face:back', edge: { start: { x: L + W, y: stripY }, end: { x: L + W, y: stripY + H } } },
    { id: 'fold:back-left', faceAId: 'face:back', faceBId: 'face:left', edge: { start: { x: L + W + L, y: stripY }, end: { x: L + W + L, y: stripY + H } } },
    { id: 'fold:front-top', faceAId: 'face:front', faceBId: 'face:top', edge: { start: { x: 0, y: stripY }, end: { x: L, y: stripY } } },
    { id: 'fold:front-bottom', faceAId: 'face:front', faceBId: 'face:bottom', edge: { start: { x: 0, y: stripY + H }, end: { x: L, y: stripY + H } } },
    { id: 'fold:glue-seam', faceAId: 'face:left', faceBId: 'gluetab:seam', edge: { start: { x: x1, y: stripY }, end: { x: x1, y: stripY + H } } },
  ]

  return {
    id: 'net:test',
    faces,
    glueTabs,
    flaps: [],
    folds,
    ...overrides,
  }
}

describe('validateNet', () => {
  it('passes a valid net', () => {
    const result = validateNet(createFakeNet(), input)
    expect(result.messages).toHaveLength(0)
  })

  it('warns when face count is wrong', () => {
    const net = createFakeNet()
    net.faces = net.faces.slice(0, 5)
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-face-count')).toBe(true)
    expect(result.valid).toBe(true)
  })

  it('warns when a face has non-positive dimensions', () => {
    const net = createFakeNet()
    net.faces[0]!.widthMm = 0
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-face-dimension')).toBe(true)
  })

  it('warns when face dimensions do not match input', () => {
    const net = createFakeNet()
    net.faces[0]!.widthMm = 999
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-face-dimension')).toBe(true)
  })

  it('warns on duplicate face names', () => {
    const net = createFakeNet()
    net.faces[0]!.name = 'Top Panel'
    net.faces[1]!.name = 'Top Panel'
    const result = validateNet(net, input)

    const dupes = result.messages.filter((m) => m.code === 'net-face-duplicate')
    expect(dupes.length).toBeGreaterThanOrEqual(1)
  })

  it('warns on invalid face name', () => {
    const net = createFakeNet()
    net.faces[0]!.name = 'Invalid Face'
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-face-name')).toBe(true)
  })

  it('warns when glue tab attaches to non-existent parent', () => {
    const net = createFakeNet()
    net.glueTabs[0]!.parentFaceId = 'face:nonexistent'
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-glue-tab-attachment')).toBe(true)
  })

  it('warns when glue tab attach edge is not on parent face edge', () => {
    const net = createFakeNet()
    net.glueTabs[0]!.attachEdge = { start: { x: 999, y: 0 }, end: { x: 999, y: 40 } }
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-glue-tab-attachment')).toBe(true)
  })

  it('warns when glue tab overlaps a non-parent face', () => {
    const net = createFakeNet()
    net.glueTabs[0]!.polygon = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 40 },
      { x: 0, y: 40 },
    ]
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-glue-tab-overlap')).toBe(true)
  })

  it('warns when fold graph is disconnected', () => {
    const net = createFakeNet()
    net.faces.push({
      id: 'face:orphan',
      name: 'Orphan Panel',
      widthMm: 10,
      heightMm: 10,
      polygon: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }],
    })
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-fold-graph')).toBe(true)
  })

  it('warns when a fold connects a face to itself', () => {
    const net = createFakeNet()
    net.folds[0]!.faceBId = net.folds[0]!.faceAId
    const result = validateNet(net, input)
    expect(result.messages.some((m) => m.code === 'net-fold-connection')).toBe(true)
  })
})
