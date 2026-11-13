import { useSyncExternalStore } from 'react'

// 底部弹出的面板：同一时间只开一个（点单菜单 / 歌单）。场景里点唱机也会打开歌单，所以放在共享状态里。

export type Panel = 'menu' | 'records' | null

let open: Panel = null
const listeners = new Set<() => void>()

export function openPanel(p: Panel) {
  if (p === open) return
  open = p
  listeners.forEach((l) => l())
}

export function closePanel() {
  openPanel(null)
}

export function usePanel() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => open,
  )
}
