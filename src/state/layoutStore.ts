import { useSyncExternalStore } from 'react'
import layoutFile from '../config/layout.json'
import type { LayoutFile, LayoutItem } from '../config/layoutTypes'

// 场景布局状态。运行时只读 layout.json；开发环境的编辑器会通过 setLayoutItems 修改它。

/** 文件里保存的那一版 */
export const fileLayoutItems = (layoutFile as LayoutFile).items

let items: LayoutItem[] = fileLayoutItems
const listeners = new Set<() => void>()

export function getLayoutItems() {
  return items
}

export function setLayoutItems(next: LayoutItem[]) {
  items = next
  listeners.forEach((l) => l())
}

export function subscribeLayout(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLayoutItems() {
  return useSyncExternalStore(subscribeLayout, getLayoutItems)
}
