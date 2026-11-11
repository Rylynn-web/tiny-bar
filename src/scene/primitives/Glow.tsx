import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'

type Props = {
  color: string
  /** 自发光分组：灯泡 / 灯带 / 屏幕 */
  group: keyof typeof sceneConfig.emissive
}

/** 自发光材质：强度 = 分组强度 × 当前时段的 glow 倍率。夜晚高于 Bloom 阈值时出光晕 */
export function Glow({ color, group }: Props) {
  const { glow } = useLighting()
  const { emissive } = useSceneParams()
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={emissive[group] * glow}
      roughness={sceneConfig.material.roughness}
      metalness={0}
    />
  )
}
