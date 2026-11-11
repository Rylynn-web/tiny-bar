import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { RoundedCylinder } from '../primitives/RoundedCylinder'

/** 方桌：奶白台面 + 深色立柱 + 圆底盘。原点在地面中心 */
export function DiningTable() {
  const { palette } = useSceneParams()
  const t = sceneConfig.diningTable
  const columnBottom = t.baseThickness
  const columnHeight = t.height - t.topThickness - columnBottom
  return (
    <group>
      <RoundedCylinder radius={t.baseRadius} height={t.baseThickness} color={palette.dark} tier="small" />
      <RoundedCylinder
        radius={t.columnRadius}
        height={columnHeight + t.columnOverlap * 2}
        position={[0, columnBottom - t.columnOverlap, 0]}
        color={palette.dark}
        tier="rod"
      />
      <BevelBox
        tier="small"
        size={[t.topSize, t.topThickness, t.topSize]}
        position={[0, t.height - t.topThickness / 2, 0]}
        color={palette.cream}
      />
    </group>
  )
}
