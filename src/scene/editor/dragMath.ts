import { MathUtils, Plane, Vector3 } from 'three'
import type { LayoutItem, Vec3 } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import { editorConfig } from '../../config/editorConfig'

const R = sceneConfig.room
export const room = {
  minX: -R.width / 2,
  maxX: R.width / 2,
  minZ: -R.depth / 2,
  maxZ: R.depth / 2,
  height: R.wallHeight,
}

export type Wall = 'back' | 'left'

/** 把角度规整到 (-180, 180] */
export function normalizeDeg(deg: number) {
  let d = ((deg % 360) + 360) % 360
  if (d > 180) d -= 360
  return d
}

/** 墙面物件贴在哪面墙：朝向 ≈ 90° 为左墙，否则为后墙 */
export function wallOf(item: LayoutItem): Wall {
  return Math.abs(normalizeDeg(item.rotationY) - 90) < 45 ? 'left' : 'back'
}

/** 拖动用的平面：地面物件 = 物件所在高度的水平面；墙面物件 = 所在墙面 */
export function dragPlane(item: LayoutItem, mount: 'floor' | 'wall') {
  if (mount === 'floor') return new Plane(new Vector3(0, 1, 0), -item.position[1])
  return wallOf(item) === 'left'
    ? new Plane(new Vector3(1, 0, 0), -room.minX)
    : new Plane(new Vector3(0, 0, 1), -room.minZ)
}

export function snap(v: number, grid: number) {
  return Math.round(v / grid) * grid
}

/** 让 [p+min, p+max] 落在 [lo, hi] 内；比范围还宽时居中 */
function clampAxis(p: number, min: number, max: number, lo: number, hi: number) {
  if (max - min >= hi - lo) return (lo + hi) / 2 - (min + max) / 2
  return MathUtils.clamp(p, lo - min, hi - max)
}

/**
 * 根据鼠标落点算出物件的新位置：吸附网格（free = true 时不吸附），并限制在房间范围内。
 * offMin/offMax 是物件包围盒相对物件原点的偏移（拖动开始时测一次）。
 */
export function constrain(
  item: LayoutItem,
  mount: 'floor' | 'wall',
  target: Vector3,
  offMin: Vector3,
  offMax: Vector3,
  free: boolean,
): Vec3 {
  const g = editorConfig.grid
  const s = (v: number) => (free ? v : snap(v, g))
  if (mount === 'floor') {
    const x = clampAxis(s(target.x), offMin.x, offMax.x, room.minX, room.maxX)
    const z = clampAxis(s(target.z), offMin.z, offMax.z, room.minZ, room.maxZ)
    return [x, item.position[1], z]
  }
  const y = clampAxis(s(target.y), offMin.y, offMax.y, 0, room.height)
  if (wallOf(item) === 'left') {
    const z = clampAxis(s(target.z), offMin.z, offMax.z, room.minZ, room.maxZ)
    return [room.minX, y, z]
  }
  const x = clampAxis(s(target.x), offMin.x, offMax.x, room.minX, room.maxX)
  return [x, y, room.minZ]
}

/** 保留三位小数，避免 JSON 里出现 0.30000000000000004 */
export function round3(v: Vec3): Vec3 {
  return v.map((n) => Math.round(n * 1000) / 1000) as Vec3
}
