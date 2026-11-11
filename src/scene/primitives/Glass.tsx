import { sceneConfig } from '../../config/sceneConfig'

type Props = { color: string }

/** 玻璃 / 亚克力：半透明标准材质，不用折射 */
export function Glass({ color }: Props) {
  const g = sceneConfig.glass
  return (
    <meshStandardMaterial
      color={color}
      transparent
      opacity={g.opacity}
      roughness={g.roughness}
      metalness={0}
      depthWrite={false}
    />
  )
}
