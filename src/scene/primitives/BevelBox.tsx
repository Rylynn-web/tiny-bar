import type { ReactNode } from 'react'
import { RoundedBox } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from './Matte'

export type BevelTier = keyof typeof sceneConfig.bevelTiers

type Props = Omit<ThreeElements['mesh'], 'args' | 'children' | 'ref' | 'material'> & {
  size: [number, number, number]
  color: string
  /** 倒角档位：大件家具 / 小件 / 细杆 */
  tier?: BevelTier
  /** 自定义材质（如金属）；不传则用哑光 color */
  surface?: ReactNode
}

/** 统一倒角的圆角方块。倒角不会超过最短边的一半 */
export function BevelBox({ size, color, tier = 'large', surface, ...rest }: Props) {
  const { bevel } = useSceneParams()
  const radius = Math.min(bevel * sceneConfig.bevelTiers[tier], Math.min(...size) / 2 - 1e-4)
  return (
    <RoundedBox
      args={size}
      radius={radius}
      smoothness={sceneConfig.detail.boxSmoothness[tier]}
      castShadow
      receiveShadow
      {...rest}
    >
      {surface ?? <Matte color={color} />}
    </RoundedBox>
  )
}
