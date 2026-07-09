import type { ShapeGenerationContext, ShapeGenerationResult } from '../shared/index.ts'
import type { BoxInput } from './index.ts'
import { buildStripNet, buildCrossNet, buildTNetCarton as buildTNetCartonRaw, buildOpenTrayNet } from './net-geometry.ts'
import { netToTemplateItem } from './net-converter.ts'

export type BoxNetType = 'strip' | 'cross' | 't-layout'

export function buildCrossNetCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const net = buildCrossNet(input)
  return netToTemplateItem(net, input, context)
}

export function buildTNetCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const net = buildTNetCartonRaw(input)
  return netToTemplateItem(net, input, context)
}

export function buildStripCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const net = buildStripNet(input)
  return netToTemplateItem(net, input, context)
}

export function buildOpenTrayCarton(
  input: BoxInput,
  context: ShapeGenerationContext,
): ShapeGenerationResult {
  const net = buildOpenTrayNet(input)
  return netToTemplateItem(net, input, context)
}

export function getBoxNetGenerator(netType: BoxNetType) {
  switch (netType) {
    case 'cross':
      return buildCrossNetCarton
    case 't-layout':
      return buildTNetCarton
    default:
      return buildStripCarton
  }
}
