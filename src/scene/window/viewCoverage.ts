import { Vector3 } from 'three'

// 窗外分层的铺满方式：每帧把窗洞的四个角沿着当前视线方向投影到各层所在的深度平面上。
// 正交相机的视线方向处处相同，所以投影出来的四边形在屏幕上正好和窗洞重合——
// 任何允许的视角下都铺满窗口、边缘不会露出来，也不会有多余的部分露到墙外。
// 坐标都是窗户的局部坐标：x 沿墙，y 向上，z 朝室内；墙外表面在 z = outerZ。

export type WindowRect = { halfWidth: number; bottom: number; top: number; outerZ: number; margin: number }

const corners = [
  [-1, 0],
  [1, 0],
  [1, 1],
  [-1, 1],
] as const

/**
 * 把窗洞投影到 z = outerZ - depth 的平面上，写入 4 个顶点（逆时针：左下、右下、右上、左上）。
 * dir 是视线方向（局部坐标，指向远离相机），必须朝墙外（dir.z < 0）。
 */
export function projectWindow(rect: WindowRect, depth: number, dir: Vector3, out: Float32Array) {
  const dz = Math.min(dir.z, -1e-3)
  const t = -depth / dz
  for (let i = 0; i < 4; i++) {
    const [sx, sy] = corners[i]
    const x = sx * (rect.halfWidth + rect.margin)
    const y = sy === 0 ? rect.bottom - rect.margin : rect.top + rect.margin
    out[i * 3] = x + dir.x * t
    out[i * 3 + 1] = y + dir.y * t
    out[i * 3 + 2] = rect.outerZ - depth
  }
}

/** 默认视角下，窗洞里某个高度（0 = 下沿，1 = 上沿）的点沿视线落到某一层上的 y 坐标 */
export function hitHeight(rect: WindowRect, depth: number, dir: Vector3, at: number) {
  const dz = Math.min(dir.z, -1e-3)
  const y = rect.bottom + (rect.top - rect.bottom) * at
  return y + dir.y * (-depth / dz)
}

/** 视线投影到某一层时，窗户中心对应点的平移量（x, y），用来做受控视差 */
export function projectionShift(depth: number, dir: Vector3, out: { x: number; y: number }) {
  const dz = Math.min(dir.z, -1e-3)
  const t = -depth / dz
  out.x = dir.x * t
  out.y = dir.y * t
  return out
}
