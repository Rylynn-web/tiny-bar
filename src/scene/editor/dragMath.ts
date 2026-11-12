import { MathUtils, Plane, Vector3, type Ray } from 'three'
import type { LayoutItem, Vec3 } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import { editorConfig } from '../../config/editorConfig'
import { roomBounds } from '../../state/layoutStore'
import { normalizeDeg, wallOf, type Wall } from '../room/walls'
import { catalog } from '../catalog'

/** 当前房间范围（房间尺寸可以在编辑器里改，所以每次现取） */
export function roomLimits() {
  return { ...roomBounds(), height: sceneConfig.room.wallHeight }
}

export type { Wall } from '../room/walls'
export { normalizeDeg, wallOf }

/** 贴在某面墙上时的朝向（度）：后墙 0、左墙 90、右墙 -90 */
export function wallRotation(wall: Wall) {
  return wall === 'left' ? 90 : wall === 'right' ? -90 : 0
}

const wallHit = new Vector3()

/**
 * 墙面物件拖动时，鼠标指着哪面墙：在允许的墙里找射线最先碰到、且落在墙面范围内的那一面。
 * 返回墙和交点；都没碰到时返回 null（保持在原来的墙上）
 */
export function pickWall(ray: Ray, allowed: Wall[]) {
  const room = roomLimits()
  const margin = editorConfig.wallSwitchMargin
  let best: { wall: Wall; point: Vector3; distance: number } | null = null
  for (const wall of allowed) {
    const plane =
      wall === 'back'
        ? new Plane(new Vector3(0, 0, 1), -room.minZ)
        : new Plane(new Vector3(1, 0, 0), -(wall === 'left' ? room.minX : room.maxX))
    if (!ray.intersectPlane(plane, wallHit)) continue
    const along = wall === 'back' ? wallHit.x : wallHit.z
    const [lo, hi] = wall === 'back' ? [room.minX, room.maxX] : [room.minZ, room.maxZ]
    if (along < lo - margin || along > hi + margin || wallHit.y < -margin || wallHit.y > room.height + margin) continue
    const distance = ray.origin.distanceTo(wallHit)
    if (!best || distance < best.distance) best = { wall, point: wallHit.clone(), distance }
  }
  return best
}

/** 把物件包围盒相对原点的偏移绕 Y 轴转 deg 度（换墙时用），返回新的最小 / 最大偏移 */
export function rotateOffsets(offMin: Vector3, offMax: Vector3, deg: number) {
  const a = MathUtils.degToRad(deg)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  const min = new Vector3(Infinity, offMin.y, Infinity)
  const max = new Vector3(-Infinity, offMax.y, -Infinity)
  for (const x of [offMin.x, offMax.x])
    for (const z of [offMin.z, offMax.z]) {
      // 和 three 的 Y 轴旋转一致：x' = x cos + z sin，z' = -x sin + z cos
      const rx = x * cos + z * sin
      const rz = -x * sin + z * cos
      min.x = Math.min(min.x, rx)
      min.z = Math.min(min.z, rz)
      max.x = Math.max(max.x, rx)
      max.z = Math.max(max.z, rz)
    }
  return { min, max }
}

/** 拖动用的平面：地面物件 = 物件所在高度的水平面；墙面物件 = 所在墙面 */
export function dragPlane(item: LayoutItem, mount: 'floor' | 'wall') {
  const room = roomLimits()
  if (mount === 'floor') return new Plane(new Vector3(0, 1, 0), -item.position[1])
  const wall = wallOf(item)
  if (wall === 'left') return new Plane(new Vector3(1, 0, 0), -room.minX)
  if (wall === 'right') return new Plane(new Vector3(1, 0, 0), -room.maxX)
  return new Plane(new Vector3(0, 0, 1), -room.minZ)
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
  /** 高度固定（落地窗这种只能左右移动的墙面物件） */
  lockY = false,
): Vec3 {
  const g = editorConfig.grid
  const room = roomLimits()
  const s = (v: number) => (free ? v : snap(v, g))
  if (mount === 'floor') {
    const x = clampAxis(s(target.x), offMin.x, offMax.x, room.minX, room.maxX)
    const z = clampAxis(s(target.z), offMin.z, offMax.z, room.minZ, room.maxZ)
    return [x, item.position[1], z]
  }
  const y = lockY ? item.position[1] : clampAxis(s(target.y), offMin.y, offMax.y, 0, room.height)
  const wall = wallOf(item)
  if (wall !== 'back') {
    const z = clampAxis(s(target.z), offMin.z, offMax.z, room.minZ, room.maxZ)
    return [wall === 'left' ? room.minX : room.maxX, y, z]
  }
  const x = clampAxis(s(target.x), offMin.x, offMax.x, room.minX, room.maxX)
  return [x, y, room.minZ]
}

/** 保留三位小数，避免 JSON 里出现 0.30000000000000004 */
export function round3(v: Vec3): Vec3 {
  return v.map((n) => Math.round(n * 1000) / 1000) as Vec3
}

const surfacePlane = new Plane(new Vector3(0, 1, 0), 0)
const surfaceHit = new Vector3()
const surfaceLocal = new Vector3()
const yAxis = new Vector3(0, 1, 0)

/**
 * 台面小物件：指针下面最先碰到的台面（沿视线最近的那块，通常也是最高的）。
 * 返回台面上的落点和台面高度；指针下面没有台面时返回 null（落回地面）
 */
export function surfaceUnder(ray: Ray, items: LayoutItem[], excludeId: string): { point: Vector3; top: number } | null {
  let best: { point: Vector3; top: number } | null = null
  let bestDist = Infinity
  for (const it of items) {
    if (it.id === excludeId) continue
    const list = catalog[it.type]?.component.surfaces
    if (!list?.length) continue
    const yaw = MathUtils.degToRad(it.rotationY)
    const scale = it.scale ?? 1
    for (const s of list) {
      const top = it.position[1] + s.height * scale
      surfacePlane.constant = -top
      if (!ray.intersectPlane(surfacePlane, surfaceHit)) continue
      surfaceLocal.set(surfaceHit.x - it.position[0], 0, surfaceHit.z - it.position[2]).applyAxisAngle(yAxis, -yaw).divideScalar(scale)
      if (surfaceLocal.x < s.min[0] || surfaceLocal.x > s.max[0] || surfaceLocal.z < s.min[1] || surfaceLocal.z > s.max[1]) continue
      const dist = ray.origin.distanceTo(surfaceHit)
      if (dist < bestDist) {
        bestDist = dist
        best = { point: surfaceHit.clone(), top }
      }
    }
  }
  return best
}
