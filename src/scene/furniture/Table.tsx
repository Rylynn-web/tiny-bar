import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { RoundedCylinder } from '../primitives/RoundedCylinder'

/** 圆桌：底座 + 立柱 + 桌面 */
export function Table() {
  const { palette } = useSceneParams()
  const t = sceneConfig.table
  const legHeight = t.height - t.topThickness - t.baseThickness
  return (
    <group position={t.position}>
      <RoundedCylinder radius={t.baseRadius} height={t.baseThickness} color={palette.dark} />
      <RoundedCylinder
        radius={t.legRadius}
        height={legHeight + 0.02}
        position={[0, t.baseThickness - 0.01, 0]}
        color={palette.dark}
      />
      <RoundedCylinder
        radius={t.topRadius}
        height={t.topThickness}
        position={[0, t.height - t.topThickness, 0]}
        color={palette.wood}
      />
    </group>
  )
}
