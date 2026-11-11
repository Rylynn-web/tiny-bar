import type { Side } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

type Props = {
  color: string
  emissive?: string
  emissiveIntensity?: number
  /** 开口薄壳（灯罩、杯子、花瓶）传 DoubleSide，避免只投半边影子 */
  shadowSide?: Side
  side?: Side
}

/** 统一哑光材质：roughness 来自 config，metalness 恒为 0 */
export function Matte({ color, emissive, emissiveIntensity, shadowSide, side }: Props) {
  const m = sceneConfig.material
  return (
    <meshStandardMaterial
      color={color}
      roughness={m.roughness}
      metalness={m.metalness}
      envMapIntensity={m.envMapIntensity}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      shadowSide={shadowSide}
      side={side}
    />
  )
}
