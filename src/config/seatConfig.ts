// 座位：从 layout 自动推导。可坐的家具在组件上挂了座位锚点（相对家具的位置和朝向），
// 这里把锚点换算到世界坐标——家具挪了、转了，座位自动跟着走。

import { useMemo } from 'react'
import { MathUtils, Vector3 } from 'three'
import type { LayoutItem, Vec3 } from './layoutTypes'
import { sceneConfig } from './sceneConfig'
import { catalog } from '../scene/catalog'
import { useLayoutItems } from '../state/layoutStore'

/** 坐姿类型：小人按它切换腿和手臂 */
export type SeatPose = 'chair' | 'stool' | 'sofa' | 'pouf'

export type Seat = {
  /** 家具只有一个座位时等于家具 id；多个座位时为 `家具id:序号` */
  id: string
  itemId: string
  /** 家具类型（catalog 的键） */
  type: string
  /** 坐垫表面中心（世界坐标），小人坐下的基准点 */
  position: Vec3
  /** 面朝方向（弧度），0 = 面朝 +Z */
  rotationY: number
  pose: SeatPose
  /** 镜头飞向这个座位时的取景（之后用） */
  focus: { target: Vec3; azimuthDeg: number; depressionDeg: number; viewSize: number }
  /** 邻座的 id（水平距离小于 seating.neighborDistance） */
  neighbors: string[]
  /** 正前方的桌面锚点（世界坐标，放杯子 / 笔记本）；前面没有桌面时为 null */
  desk: Vec3 | null
  /** 桌面属于哪件家具（同一张桌子的座位算一组：拼桌 / 一起来的朋友） */
  deskItemId: string | null
  /**
   * 点的东西放在哪（世界坐标，桌面高度）：有正前方的桌面就用它；没有（沙发、方凳）就用附近最近的桌面上、
   * 离座位最近的那一点；附近都没有桌面为 null（点了也不显示）
   */
  table: Vec3 | null
}

const up = new Vector3(0, 1, 0)

export function deriveSeats(items: LayoutItem[]): Seat[] {
  const f = sceneConfig.seating.focus
  const seats: Seat[] = []

  for (const item of items) {
    const allAnchors = catalog[item.type]?.component.seats
    if (!allAnchors?.length) continue
    // layout 里可以用 props.seats 限制启用前几个座位（0 = 这件家具不提供座位）
    const limit = typeof item.props?.seats === 'number' ? item.props.seats : allAnchors.length
    const anchors = allAnchors.slice(0, Math.max(0, limit))
    if (!anchors.length) continue
    const yaw = MathUtils.degToRad(item.rotationY)
    const scale = item.scale ?? 1
    anchors.forEach((a, i) => {
      const local = new Vector3(...a.position).multiplyScalar(scale).applyAxisAngle(up, yaw)
      const position: Vec3 = [item.position[0] + local.x, item.position[1] + local.y, item.position[2] + local.z]
      seats.push({
        id: allAnchors.length === 1 ? item.id : `${item.id}:${i}`,
        itemId: item.id,
        type: item.type,
        position,
        rotationY: yaw + a.rotationY,
        pose: a.pose,
        focus: {
          target: [position[0], position[1] + f.lift, position[2]],
          azimuthDeg: f.azimuthDeg,
          depressionDeg: f.depressionDeg,
          viewSize: f.viewSize,
        },
        neighbors: [],
        desk: null,
        deskItemId: null,
        table: null,
      })
    })
  }

  // 邻座：水平距离足够近
  const d = sceneConfig.seating.neighborDistance
  for (let i = 0; i < seats.length; i++) {
    for (let j = i + 1; j < seats.length; j++) {
      const a = seats[i].position
      const b = seats[j].position
      if (Math.hypot(a[0] - b[0], a[2] - b[2]) < d) {
        seats[i].neighbors.push(seats[j].id)
        seats[j].neighbors.push(seats[i].id)
      }
    }
  }
  // 桌面锚点：沿座位正前方往外找，第一个落在某块桌面里、且高度合适的点
  const D = sceneConfig.seating.desk
  const surfaces = items.flatMap((item) => {
    const list = catalog[item.type]?.component.surfaces
    if (!list?.length) return []
    const yaw = MathUtils.degToRad(item.rotationY)
    const scale = item.scale ?? 1
    return list.map((s) => ({ item, yaw, scale, s }))
  })
  const probe = new Vector3()
  const local = new Vector3()
  const inside = (p: Vector3, seatY: number) => {
    for (const { item, yaw, scale, s } of surfaces) {
      const top = item.position[1] + s.height * scale
      if (top <= seatY + 0.05 || top > seatY + D.maxRise) continue
      local.set(p.x - item.position[0], 0, p.z - item.position[2]).applyAxisAngle(up, -yaw).divideScalar(scale)
      if (local.x >= s.min[0] && local.x <= s.max[0] && local.z >= s.min[1] && local.z <= s.max[1]) return { top, itemId: item.id }
    }
    return null
  }
  for (const seat of seats) {
    const fx = Math.sin(seat.rotationY)
    const fz = Math.cos(seat.rotationY)
    for (let d = D.reach[0]; d <= D.reach[1] + 1e-6; d += D.step) {
      probe.set(seat.position[0] + fx * d, 0, seat.position[2] + fz * d)
      const hit = inside(probe, seat.position[1])
      if (hit === null) continue
      // 往桌里再挪一点；挪出桌面就用找到的那个点
      const inner = probe.clone().add(new Vector3(fx * D.inset, 0, fz * D.inset))
      const p = inside(inner, seat.position[1]) !== null ? inner : probe
      seat.desk = [p.x, hit.top, p.z]
      seat.deskItemId = hit.itemId
      break
    }
  }
  // 放点单的位置：没有正前方桌面时，找最近的桌面上离座位最近的点（往桌里收一点）
  const O = sceneConfig.order
  for (const seat of seats) {
    if (seat.desk) {
      seat.table = seat.desk
      continue
    }
    let best: Vec3 | null = null
    let bestD: number = O.nearestSurface
    for (const { item, yaw, scale, s } of surfaces) {
      // 太高的台面（书柜顶、吧台）不算
      if (item.position[1] + s.height * scale > seat.position[1] + D.maxRise) continue
      local.set(seat.position[0] - item.position[0], 0, seat.position[2] - item.position[2]).applyAxisAngle(up, -yaw).divideScalar(scale)
      const inset = O.surfaceInset / scale
      const cx = MathUtils.clamp(local.x, Math.min(s.min[0] + inset, (s.min[0] + s.max[0]) / 2), Math.max(s.max[0] - inset, (s.min[0] + s.max[0]) / 2))
      const cz = MathUtils.clamp(local.z, Math.min(s.min[1] + inset, (s.min[1] + s.max[1]) / 2), Math.max(s.max[1] - inset, (s.min[1] + s.max[1]) / 2))
      const p = new Vector3(cx, 0, cz).multiplyScalar(scale).applyAxisAngle(up, yaw)
      const wx = item.position[0] + p.x
      const wz = item.position[2] + p.z
      const d = Math.hypot(wx - seat.position[0], wz - seat.position[2])
      if (d < bestD) {
        bestD = d
        best = [wx, item.position[1] + s.height * scale, wz]
      }
    }
    seat.table = best
  }
  return seats
}

/** 当前布局下的全部座位（布局变化时重新推导） */
export function useSeats() {
  const items = useLayoutItems()
  return useMemo(() => deriveSeats(items), [items])
}

