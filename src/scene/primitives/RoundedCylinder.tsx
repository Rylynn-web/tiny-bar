import { useMemo } from 'react'
import { LatheGeometry, Vector2 } from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from './Matte'

type Props = Omit<ThreeElements['mesh'], 'args' | 'children' | 'ref'> & {
  radius: number
  height: number
  color: string
  segments?: number
}

const ARC_STEPS = 6

/** 上下边缘带统一倒角的圆柱（旋转体）。原点在底面中心 */
export function RoundedCylinder({ radius, height, color, segments = 48, ...rest }: Props) {
  const { bevel } = useSceneParams()
  const geometry = useMemo(() => {
    const b = Math.min(bevel, radius - 1e-4, height / 2 - 1e-4)
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
    return new LatheGeometry(pts, segments)
  }, [bevel, radius, height, segments])

  return (
    <mesh geometry={geometry} castShadow receiveShadow {...rest}>
      <Matte color={color} />
    </mesh>
  )
}
