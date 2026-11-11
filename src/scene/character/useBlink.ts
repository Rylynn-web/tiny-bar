import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Object3D } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

const cfg = sceneConfig.buddy.blink
const nextInterval = () => cfg.minInterval + Math.random() * (cfg.maxInterval - cfg.minInterval)

/** 每隔 3–6 秒随机眨一次眼：Y 缩放 1 → closedScale → 1，用时 duration */
export function useBlink(eyes: RefObject<Object3D | null>[]) {
  const next = useRef<number | null>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (next.current === null) next.current = t + nextInterval()

    const start = next.current
    let k = 1
    if (t >= start) {
      const p = (t - start) / cfg.duration
      if (p >= 1) {
        next.current = t + nextInterval()
      } else {
        // 三角波：前半闭眼，后半睁眼
        const closed = p < 0.5 ? p * 2 : (1 - p) * 2
        k = 1 - (1 - cfg.closedScale) * closed
      }
    }
    for (const eye of eyes) {
      if (eye.current) eye.current.scale.y = k
    }
  })
}
