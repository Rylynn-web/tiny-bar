import { useMemo, type ReactNode } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from './Matte'

type Props = Omit<ThreeElements['mesh'], 'args' | 'children' | 'ref' | 'material'> & {
  radius: number
  height: number
  color: string
  segments?: number
  tier?: keyof typeof sceneConfig.bevelTiers
  /** 自定义材质（如金属）；不传则用哑光 color */
  surface?: ReactNode
}


/** 上下边缘带统一倒角的圆柱（旋转体）。原点在底面中心 */
export function RoundedCylinder({ radius, height, color, segments, tier = 'large', surface, ...rest }: Props) {
  const radial = segments ?? sceneConfig.detail.cylinderSegments[tier]
  const ARC_STEPS = sceneConfig.detail.cylinderArcSteps[tier]
  const { bevel } = useSceneParams()
  const tierBevel = bevel * sceneConfig.bevelTiers[tier]
  const geometry = useMemo(() => {
    const b = Math.min(tierBevel, radius - 1e-4, height / 2 - 1e-4)
    const pts: Vector2[] = [new Vector2(0, 0)]
    // 底边圆角：圆心 (radius-b, b)，从 -90° 到 0°
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = -Math.PI / 2 + (i / ARC_STEPS) * (Math.PI / 2)
      pts.push(new Vector2(radius - b + b * Math.cos(a), b + b * Math.sin(a)))
    }
    // 顶边圆角：圆心 (radius-b, height-b)，从 0° 到 90°
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = (i / ARC_STEPS) * (Math.PI / 2)
      pts.push(new Vector2(radius - b + b * Math.cos(a), height - b + b * Math.sin(a)))
    }
    pts.push(new Vector2(0, height))
    return new LatheGeometry(pts, radial)
  }, [tierBevel, radius, height, radial, ARC_STEPS])

  return (
    <mesh geometry={geometry} castShadow receiveShadow {...rest}>
      {surface ?? <Matte color={color} />}
    </mesh>
  )
}
