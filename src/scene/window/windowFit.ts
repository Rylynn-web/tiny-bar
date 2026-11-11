import type { LayoutItem } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import type { RoomBounds } from '../../state/layoutStore'
import { windowWidth } from './windowSize'
import { wallOf } from '../room/walls'

/**
 * 窗户在墙上实际占的位置：宽度不超过墙长（两端各留 wallMargin），超出时先缩窄、再挪回墙内。
 * 房间变窄时窗户跟着变小。返回所在的墙、沿墙方向的中心坐标（后墙 = x，左右墙 = z）和宽度。
 */
export function fitWindow(item: LayoutItem, bounds: RoomBounds) {
  const m = sceneConfig.cityWindow.wallMargin
  const wall = wallOf(item)
  const side = wall !== 'back'
  const lo = (side ? bounds.minZ : bounds.minX) + m
  const hi = (side ? bounds.maxZ : bounds.maxX) - m
  const along = side ? item.position[2] : item.position[0]
  const want = windowWidth(item.props)
  // 先按原位置裁掉超出墙的部分，再保证不小于最小宽度
  let a = Math.max(lo, along - want / 2)
  let b = Math.min(hi, along + want / 2)
  const minW = Math.min(sceneConfig.cityWindow.minWidth, hi - lo)
  if (b - a < minW) {
    const c = Math.min(Math.max(along, lo + minW / 2), hi - minW / 2)
    a = c - minW / 2
    b = c + minW / 2
  }
  return { wall, center: (a + b) / 2, width: b - a, along }
}
