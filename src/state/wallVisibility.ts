import { useSyncExternalStore } from 'react'
import { Mesh, type Object3D } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import type { SideWall } from '../scene/room/walls'

// 左右墙按视角显示 / 不显示（没有过渡）。每帧由 WallVisibilityDriver 更新；墙和墙面物件在自己的 useFrame 里读。
// 每帧变化的结果放在普通对象里，不触发 React 重渲染；只有"模式"是订阅式状态（编辑器开关用）。

const W = sceneConfig.walls

/** follow = 跟随视角；showAll = 显示全部（编辑器里用） */
export type WallMode = 'follow' | 'showAll'

export const wallState = {
  /** 每面侧墙当前是否显示 */
  visible: { left: true, right: true } as Record<SideWall, boolean>,
}

let mode: WallMode = 'follow'
const listeners = new Set<() => void>()

export function getWallMode() {
  return mode
}
export function setWallMode(m: WallMode) {
  if (m === mode) return
  mode = m
  listeners.forEach((l) => l())
}
export function useWallMode() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => mode,
  )
}

/**
 * 按摄像机方位角（度，0 = 正对后墙，正 = 偏右）更新侧墙显示。
 * 左右墙同时只显示一面：正对或偏右显示左墙，偏左显示右墙（正对时优先左墙）。
 */
export function updateWalls(azimuthDeg: number) {
  const all = mode === 'showAll'
  const left = azimuthDeg >= W.switchDeg
  wallState.visible.left = all || left
  wallState.visible.right = all || !left
}

// ── 点击检测开关：降下的墙、被隐藏的墙面物件不挡点击 ──
const noRaycast = () => {}

/** 开启 / 关闭一个物体及其所有子网格的点击检测（会记住原来的 raycast，恢复时还原） */
export function setRaycastable(root: Object3D, enabled: boolean) {
  root.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    if (enabled) {
      if (m.userData.savedRaycast) {
        m.raycast = m.userData.savedRaycast
        delete m.userData.savedRaycast
      }
    } else if (!m.userData.savedRaycast) {
      m.userData.savedRaycast = m.raycast ?? Mesh.prototype.raycast
      m.raycast = noRaycast
    }
  })
}
