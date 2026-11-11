import type { LayoutItem } from '../../config/layoutTypes'

// 三面墙的命名以默认视角为准：左墙（-X，沙发、书架）、后墙（-Z，吧台）、右墙（+X），前面（+Z）敞开。

export type Wall = 'back' | 'left' | 'right'
export type SideWall = 'left' | 'right'

/** 把角度规整到 (-180, 180] */
export function normalizeDeg(deg: number) {
  let d = ((deg % 360) + 360) % 360
  if (d > 180) d -= 360
  return d
}

/** 墙面物件贴在哪面墙：朝向 ≈ 90°（面朝 +X）为左墙，≈ -90° 为右墙，否则为后墙 */
export function wallOf(item: LayoutItem): Wall {
  const d = normalizeDeg(item.rotationY)
  if (Math.abs(d - 90) < 45) return 'left'
  if (Math.abs(d + 90) < 45) return 'right'
  return 'back'
}
