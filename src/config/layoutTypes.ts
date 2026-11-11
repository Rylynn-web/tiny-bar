// layout.json 的数据结构

export type Vec3 = [number, number, number]

export type LayoutProps = Record<string, string | number | boolean>

export type LayoutItem = {
  id: string
  /** 物件类型，对应 src/scene/catalog.ts 里的一项 */
  type: string
  /** 世界坐标。地面物件 y 一般为 0；墙面物件 y 为安装高度，贴在墙面上 */
  position: Vec3
  /** 绕竖直轴的朝向（度）。0 = 正面朝 +Z。墙面物件：0 = 后墙，90 = 左墙 */
  rotationY: number
  scale?: number
  /** 同一类型的变体参数，如椅子颜色、置物架上放什么 */
  props?: LayoutProps
}

export type LayoutFile = { items: LayoutItem[] }
