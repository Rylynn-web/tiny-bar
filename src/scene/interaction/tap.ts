import { useEffect } from 'react'
import { useThree, type ThreeEvent } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { requestResetView } from '../../state/cameraActions'

const cfg = sceneConfig.interaction

/**
 * 给可点击物体用：R3F 的 e.delta 是按下到抬起的指针位移（像素）。
 * 超过阈值说明用户是在拖动镜头，不应触发点击。
 */
export function isTap(e: ThreeEvent<MouseEvent>) {
  return e.delta <= cfg.tapThreshold
}

// 可点击物体在 onPointerDown 里调用它，双击判定就会知道这次点在了物体上而不是空白处
let interactiveHitAt = -Infinity
export function markInteractiveHit() {
  interactiveHitAt = performance.now()
}

/**
 * 双击 / 双击屏幕空白处 → 回到全景。
 * 用指针事件自己判定（鼠标和触摸一致），移动超过阈值或多指操作都不算点按。
 */
export function DoubleTapReset() {
  const el = useThree((s) => s.gl.domElement)

  useEffect(() => {
    const active = new Map<number, { x: number; y: number; moved: number }>()
    let multi = false
    let gestureStart = 0
    let lastTap: { x: number; y: number; t: number } | null = null

    const down = (e: PointerEvent) => {
      if (active.size === 0) {
        multi = false
        gestureStart = performance.now()
      } else {
        multi = true
      }
      active.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0 })
    }
    const move = (e: PointerEvent) => {
      const a = active.get(e.pointerId)
      if (!a) return
      a.moved = Math.max(a.moved, Math.hypot(e.clientX - a.x, e.clientY - a.y))
    }
    const up = (e: PointerEvent) => {
      const a = active.get(e.pointerId)
      active.delete(e.pointerId)
      if (!a || multi || active.size > 0) return
      const isTapNow = a.moved <= cfg.tapThreshold && interactiveHitAt < gestureStart
      if (!isTapNow) {
        lastTap = null
        return
      }
      const now = performance.now()
      if (
        lastTap &&
        now - lastTap.t <= cfg.doubleTapMs &&
        Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) <= cfg.doubleTapDistance
      ) {
        lastTap = null
        requestResetView()
      } else {
        lastTap = { x: e.clientX, y: e.clientY, t: now }
      }
    }
    const cancel = (e: PointerEvent) => {
      active.delete(e.pointerId)
      lastTap = null
    }

    // 按下只认画布；移动和抬起挂在 window 上，手指拖出画布再松开也能收到，不会残留"按着"的状态
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
    }
  }, [el])

  return null
}
