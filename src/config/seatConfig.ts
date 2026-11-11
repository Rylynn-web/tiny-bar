// 8 个座位。坐标由家具摆放位置算出——家具挪了，座位自动跟着走。
// 这一阶段只有数据：点击座位、坐下、镜头飞过去之后再做。

import { sceneConfig } from './sceneConfig'

type Vec3 = [number, number, number]

export type SeatZone = 'bar' | 'tableA' | 'tableB' | 'lounge'
export type SeatFurniture = 'stool' | 'chair' | 'sofa' | 'pouf'
/** 坐姿类型：小人按它切换腿和手臂 */
export type SeatPose = 'chair' | 'stool' | 'sofa' | 'pouf'

export type Seat = {
  id: string
  zone: SeatZone
  furniture: SeatFurniture
  /** 坐垫表面中心（世界坐标），小人坐下的基准点 */
  position: Vec3
  /** 面朝方向：绕 Y 轴，0 = 面朝 +Z */
  rotationY: number
  pose: SeatPose
  /** 镜头飞向这个座位时的取景（之后用） */
  focus: {
    target: Vec3
    azimuthDeg: number
    depressionDeg: number
    viewSize: number
  }
  /** 对应家具是否已经搭好；false 时坐标只是按区域锚点估的占位 */
  ready: boolean
}

const focusDefaults = { azimuthDeg: 45, depressionDeg: 38, viewSize: 2.4 }
const focusLift = 0.45

function makeFocus(position: Vec3): Seat['focus'] {
  return { target: [position[0], position[1] + focusLift, position[2]], ...focusDefaults }
}

/** 一张双人桌的两把椅子：沿 X 轴面对面，-X 一侧为 1 号 */
function tableSeats(key: 'A' | 'B', zone: SeatZone): Seat[] {
  const [x, , z] = sceneConfig.tables[key].position
  const d = sceneConfig.diningTable.chairOffset
  const h = sceneConfig.shellChair.seatHeight
  const seats: [Vec3, number][] = [
    [[x - d, h, z], Math.PI / 2], // 面朝 +X
    [[x + d, h, z], -Math.PI / 2], // 面朝 -X
  ]
  return seats.map(([position, rotationY], i) => ({
    id: `${zone}-${i + 1}`,
    zone,
    furniture: 'chair',
    position,
    rotationY,
    pose: 'chair',
    focus: makeFocus(position),
    ready: true,
  }))
}

// ── 占位：吧台区（第二批）、沙发区（第三批）搭好后改成按家具计算 ──
const bar = sceneConfig.zones.bar
const lounge = sceneConfig.zones.lounge
const placeholder = (
  id: string,
  zone: SeatZone,
  furniture: SeatFurniture,
  pose: SeatPose,
  position: Vec3,
  rotationY: number,
): Seat => ({ id, zone, furniture, pose, position, rotationY, focus: makeFocus(position), ready: false })

export const seats: Seat[] = [
  placeholder('bar-1', 'bar', 'stool', 'stool', [bar.x + 0.9, 0.72, bar.z + 0.55], Math.PI),
  placeholder('bar-2', 'bar', 'stool', 'stool', [bar.x + 1.5, 0.72, bar.z + 0.55], Math.PI),
  ...tableSeats('A', 'tableA'),
  ...tableSeats('B', 'tableB'),
  placeholder('lounge-sofa', 'lounge', 'sofa', 'sofa', [lounge.x, 0.42, lounge.z], Math.PI / 4),
  placeholder('lounge-pouf', 'lounge', 'pouf', 'pouf', [lounge.x + 1.4, 0.4, lounge.z - 0.3], -Math.PI / 2),
]

export function getSeat(id: string) {
  const seat = seats.find((s) => s.id === id)
  if (!seat) throw new Error(`未知座位：${id}`)
  return seat
}
