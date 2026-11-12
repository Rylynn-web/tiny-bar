import type { TimeOfDay } from './sceneConfig'

// 菜单：白天卖咖啡，晚上卖酒。图片在 public/menu/（透明 PNG，256×256，由原图缩小而来）。
// 桌上最多同时放一杯饮品 + 一份小食；再点同类会替换原来的。

export type MenuKind = 'drink' | 'food'
export type MenuId = 'coffee' | 'latte' | 'matcha' | 'bread' | 'sunrise' | 'whiskey' | 'redwine' | 'fries'

export type MenuItem = {
  id: MenuId
  kind: MenuKind
  /** 图片路径（相对网站根目录） */
  image: string
  /** 放在桌上时图片的宽度（米）：图片带留白，而且要和小人（0.95 米高）的比例相称，所以比实物大不少 */
  size: number
}

const item = (id: MenuId, kind: MenuKind, size: number): MenuItem => ({ id, kind, image: `/menu/${id}.png`, size })

export const menuItems: Record<MenuId, MenuItem> = {
  coffee: item('coffee', 'drink', 0.27),
  latte: item('latte', 'drink', 0.28),
  matcha: item('matcha', 'drink', 0.27),
  bread: item('bread', 'food', 0.34),
  sunrise: item('sunrise', 'drink', 0.3),
  whiskey: item('whiskey', 'drink', 0.24),
  redwine: item('redwine', 'drink', 0.29),
  fries: item('fries', 'food', 0.34),
}

/** 每个时段的菜单（按显示顺序） */
export const menus: Record<TimeOfDay, MenuId[]> = {
  day: ['coffee', 'latte', 'matcha', 'bread'],
  night: ['sunrise', 'whiskey', 'redwine', 'fries'],
}

/** 图集里的顺序（所有菜品一张图，桌上的图片按格子取） */
export const menuAtlasOrder: MenuId[] = ['coffee', 'latte', 'matcha', 'bread', 'sunrise', 'whiskey', 'redwine', 'fries']

export function isMenuId(x: unknown): x is MenuId {
  return typeof x === 'string' && x in menuItems
}
