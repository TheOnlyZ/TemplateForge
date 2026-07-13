import type { Net } from '../../geometry/net.ts'
import type { BoxStyle } from './index.ts'

export type BoxTopologyId = 'closed-carton' | 'open-tray'

export interface BoxTopologyDefinition {
  id: BoxTopologyId
  label: string
  expectedFaceCount: number
  allowSwappedSideDimensions: boolean
}

const CLOSED_CARTON_TOPOLOGY: BoxTopologyDefinition = {
  id: 'closed-carton',
  label: 'Closed Carton',
  expectedFaceCount: 6,
  allowSwappedSideDimensions: false,
}

const OPEN_TRAY_TOPOLOGY: BoxTopologyDefinition = {
  id: 'open-tray',
  label: 'Open Tray',
  expectedFaceCount: 5,
  allowSwappedSideDimensions: true,
}

export function getBoxTopologyForStyle(style: BoxStyle): BoxTopologyDefinition {
  return style === 'open-tray' ? OPEN_TRAY_TOPOLOGY : CLOSED_CARTON_TOPOLOGY
}

export function getBoxTopologyForNet(net: Net): BoxTopologyDefinition {
  return net.id === 'net:open-tray' ? OPEN_TRAY_TOPOLOGY : CLOSED_CARTON_TOPOLOGY
}
