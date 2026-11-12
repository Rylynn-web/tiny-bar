import type { ComponentType } from 'react'
import type { LayoutItem, LayoutProps, Vec3 } from '../config/layoutTypes'
import type { SeatPose } from '../config/seatConfig'

/** 目录里每个组件收到的参数：layout 里的 props（已合并默认值），以及物件本身（需要知道自己位置的组件用） */
export type CatalogProps = { props: LayoutProps; item?: LayoutItem }

/**
 * 座位锚点：相对于家具原点的位置（坐垫表面中心）和朝向（弧度，0 = 面朝家具的 +Z）。
 * 可坐的家具把它挂在组件的静态属性 seats 上。
 */
export type SeatAnchor = { position: Vec3; rotationY: number; pose: SeatPose }

/** 桌面：家具局部坐标里的一块水平矩形（x / z 范围）和台面高度。座位会沿正前方找最近的桌面放道具 */
export type SurfaceAnchor = { min: [number, number]; max: [number, number]; height: number }

export type SeatableComponent = ComponentType<CatalogProps> & { seats?: SeatAnchor[]; surfaces?: SurfaceAnchor[] }

/** 安装方式：地面物件在地板平面上拖动，墙面物件沿所在的墙拖动 */
export type Mount = 'floor' | 'wall'

export type CatalogEntry = {
  label: string
  mount: Mount
  component: SeatableComponent
  defaultProps?: LayoutProps
  /** 参与重叠检测（地毯、吊灯这类允许和别的东西叠在一起的设为 false） */
  collide?: boolean
  /** 不参与网格合并（以后需要单独动起来的物件设为 false） */
  merge?: boolean
  /** 墙面物件只能沿墙水平移动、高度固定 */
  lockY?: boolean
  /** 编辑器侧边栏里可以直接改的数值属性（写进 layout 的 props） */
  editableProps?: { key: string; label: string; min: number; max: number; step: number; default?: number }[]
  /** 编辑器里的按钮：点一下把这个数值属性换成一个新的随机种子（如画作的"换一幅 / 换配色"） */
  editorActions?: { label: string; reseed: string }[]
  /** 编辑器里可以换颜色的部位：props 里的键名、显示名、默认调色板键 */
  colorProps?: { key: string; label: string; fallback: string }[]
}
