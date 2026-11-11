import type { LayoutItem } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import type { RoomBounds } from '../../state/layoutStore'
import { windowWidth } from './windowSize'

/** 窗户贴在哪面墙：朝向 ≈ 90° 为左墙，否则为后墙 */
export function onLeftWall(item: LayoutItem) {
  const d = ((((item.rotationY % 360) + 360) % 360) + 180) % 360 - 180
  return Math.abs(d - 90) < 45
}

/**
 * 窗户在墙上实际占的位置：宽度不超过墙长（两端各留 wallMargin），超出时先缩窄、再挪回墙内。
 * 房间变窄时窗户跟着变小。返回沿墙方向的中心坐标（后墙 = x，左墙 = z）和宽度。
 */
export function fitWindow(item: LayoutItem, bounds: RoomBounds) {
  const m = sceneConfig.cityWindow.wallMargin
  const left = onLeftWall(item)
  const lo = (left ? bounds.minZ : bounds.minX) + m
  const hi = (left ? bounds.maxZ : bounds.maxX) - m
  const along = left ? item.position[2] : item.position[0]
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
  return { left, center: (a + b) / 2, width: b - a, along }
}
