import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'

type Props = {
  color: string
  /** 自发光分组（每种灯一组） */
  group: keyof typeof sceneConfig.emissive
  /** 单件灯的亮度倍数（编辑器里的「亮度」） */
  multiplier?: number
}

/** 自发光材质：强度 = 分组强度 × 当前时段的 glow 倍率。夜晚高于 Bloom 阈值时出光晕 */
export function Glow({ color, group, multiplier = 1 }: Props) {
  const { glow } = useLighting()
  const { emissive } = useSceneParams()
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={emissive[group] * glow * multiplier}
      roughness={sceneConfig.material.roughness}
      metalness={0}
    />
  )
}
