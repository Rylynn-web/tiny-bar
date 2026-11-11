import { sceneConfig } from '../../config/sceneConfig'

type Props = {
  color: string
  emissive?: string
  emissiveIntensity?: number
}

/** 统一哑光材质：roughness 来自 config，metalness 恒为 0 */
export function Matte({ color, emissive, emissiveIntensity }: Props) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={sceneConfig.material.roughness}
      metalness={sceneConfig.material.metalness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  )
}
