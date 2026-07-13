import type { Net } from '../../geometry/net.ts'
import { netToTemplateItem } from './net-converter.ts'
import type { BoxInput } from './index.ts'
import type { ShapeGenerationContext, ShapeGenerationResult } from '../shared/index.ts'
import type { BoxNetType } from './nets.ts'
import { buildOpenTrayNet, getNetGenerator as getRawNetGenerator } from './net-geometry.ts'

const GLUE_TAB_CARTON_NET_ORDER: BoxNetType[] = ['strip']
const ALL_NET_ORDER: BoxNetType[] = ['strip', 'cross', 't-layout']

export interface BoxTemplateCandidate {
  netType: BoxNetType | null
  net: Net
  result: ShapeGenerationResult
}

function buildCandidate(
  netType: BoxNetType | null,
  net: Net,
  input: BoxInput,
  context: ShapeGenerationContext,
): BoxTemplateCandidate {
  return {
    netType,
    net,
    result: netToTemplateItem(net, input, context),
  }
}

export function generateBoxTemplateCandidates(
  input: BoxInput,
  context: ShapeGenerationContext,
): BoxTemplateCandidate[] {
  if (input.style === 'open-tray') {
    return [buildCandidate(null, buildOpenTrayNet(input), input, context)]
  }

  const netOrder = input.style === 'glue-tab-carton' ? GLUE_TAB_CARTON_NET_ORDER : ALL_NET_ORDER

  return netOrder.map((netType) => {
    const net = getRawNetGenerator(netType)(input)
    return buildCandidate(netType, net, input, context)
  })
}
