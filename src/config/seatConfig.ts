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
}

const up = new Vector3(0, 1, 0)

export function deriveSeats(items: LayoutItem[]): Seat[] {
  const f = sceneConfig.seating.focus
  const seats: Seat[] = []

  for (const item of items) {
    const anchors = catalog[item.type]?.component.seats
    if (!anchors?.length) continue
    const yaw = MathUtils.degToRad(item.rotationY)
    const scale = item.scale ?? 1
    anchors.forEach((a, i) => {
      const local = new Vector3(...a.position).multiplyScalar(scale).applyAxisAngle(up, yaw)
      const position: Vec3 = [item.position[0] + local.x, item.position[1] + local.y, item.position[2] + local.z]
      seats.push({
        id: anchors.length === 1 ? item.id : `${item.id}:${i}`,
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
  return seats
}

/** 当前布局下的全部座位（布局变化时重新推导） */
export function useSeats() {
  const items = useLayoutItems()
  return useMemo(() => deriveSeats(items), [items])
}
