import { useSyncExternalStore } from 'react'
import { MathUtils, Mesh, type Object3D } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import type { SideWall } from '../scene/room/walls'

// 左右墙随视角自动降低。每帧由 WallVisibilityDriver 更新；墙和墙面物件在自己的 useFrame 里读。
// 每帧变化的数值（高度）放在普通对象里，不触发 React 重渲染；只有"模式"是订阅式状态（编辑器开关用）。

const W = sceneConfig.walls

/** follow = 跟随视角；showAll = 显示全部（编辑器里用） */
export type WallMode = 'follow' | 'showAll'

export const wallState = {
  /** 当前被降低的侧墙；null = 两面都在（只在开场正好落在缓冲区间时出现） */
  hidden: null as SideWall | null,
  /** 升降进度：1 = 完整的墙，0 = 降到墙基 */
  progress: { left: 1, right: 1 } as Record<SideWall, number>,
  /** 当前墙高占完整墙高的比例（loweredRatio … 1，已做缓动） */
  ratio: { left: 1, right: 1 } as Record<SideWall, number>,
  initialized: false,
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
 * 按摄像机方位角（度，0 = 正对后墙，正 = 偏右）推进一帧。
 * 偏右超过缓冲降右墙，偏左超过缓冲降左墙，缓冲区间内保持上一次的结果，避免来回闪。
 */
export function stepWalls(azimuthDeg: number, delta: number) {
  if (azimuthDeg > W.hideBufferDeg) wallState.hidden = 'right'
  else if (azimuthDeg < -W.hideBufferDeg) wallState.hidden = 'left'

  const step = delta / Math.max(W.transitionSeconds, 1e-3)
  for (const side of ['left', 'right'] as const) {
    const target = mode === 'showAll' || wallState.hidden !== side ? 1 : 0
    // 第一帧直接到位，不播放开场动画
    const p = wallState.initialized ? MathUtils.clamp(wallState.progress[side] + Math.sign(target - wallState.progress[side]) * step, 0, 1) : target
    wallState.progress[side] = p
    wallState.ratio[side] = MathUtils.lerp(W.loweredRatio, 1, MathUtils.smoothstep(p, 0, 1))
  }
  wallState.initialized = true
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
