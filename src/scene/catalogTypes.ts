import type { ComponentType } from 'react'
import type { LayoutProps, Vec3 } from '../config/layoutTypes'
import type { SeatPose } from '../config/seatConfig'

/** 目录里每个组件收到的参数：layout 里的 props（已合并默认值） */
export type CatalogProps = { props: LayoutProps }

/**
 * 座位锚点：相对于家具原点的位置（坐垫表面中心）和朝向（弧度，0 = 面朝家具的 +Z）。
 * 可坐的家具把它挂在组件的静态属性 seats 上。
 */
export type SeatAnchor = { position: Vec3; rotationY: number; pose: SeatPose }

export type SeatableComponent = ComponentType<CatalogProps> & { seats?: SeatAnchor[] }

/** 安装方式：地面物件在地板平面上拖动，墙面物件沿所在的墙拖动 */
export type Mount = 'floor' | 'wall'

export type CatalogEntry = {
  label: string
  mount: Mount
  component: SeatableComponent
  defaultProps?: LayoutProps
  /** 参与重叠检测（地毯、吊灯这类允许和别的东西叠在一起的设为 false） */
  collide?: boolean
}
