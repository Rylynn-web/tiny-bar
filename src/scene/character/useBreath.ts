import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Object3D } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

const cfg = sceneConfig.buddy.breath

/**
 * 呼吸：躯干（以底部为支点）沿 Y 轻微伸缩，头跟着上下，稍有滞后显得软。
 * headRise = 躯干从支点到头底的高度，用来把伸缩量换算成头的位移。
 */
export function useBreath(
  torso: RefObject<Object3D | null>,
  head: RefObject<Object3D | null>,
  headBaseY: number,
  headRise: number,
) {
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const w = (2 * Math.PI) / cfg.period
    if (torso.current) torso.current.scale.y = 1 + cfg.amplitude * Math.sin(w * t)
    if (head.current) {
      head.current.position.y = headBaseY + headRise * cfg.amplitude * Math.sin(w * (t - cfg.headLag))
    }
  })
}
