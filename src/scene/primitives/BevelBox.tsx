import { RoundedBox } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from './Matte'

type Props = Omit<ThreeElements['mesh'], 'args' | 'children' | 'ref'> & {
  size: [number, number, number]
  color: string
}

/** 统一倒角的圆角方块。倒角不会超过最短边的一半 */
export function BevelBox({ size, color, ...rest }: Props) {
  const { bevel } = useSceneParams()
  const radius = Math.min(bevel, Math.min(...size) / 2 - 1e-4)
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={sceneConfig.bevelSmoothness}
      castShadow
      receiveShadow
      {...rest}
    >
      <Matte color={color} />
    </RoundedBox>
  )
}
