import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'

/** 椅子：座面 + 靠背 + 四条腿。局部 +Z 为正面 */
export function Chair() {
  const { palette } = useSceneParams()
  const c = sceneConfig.chair
  const half = c.seatSize / 2
  const legInset = half - c.legSize / 2 - 0.02
  const legHeight = c.seatHeight - c.seatThickness
  const legs: [number, number][] = [
    [-legInset, -legInset],
    [legInset, -legInset],
    [-legInset, legInset],
    [legInset, legInset],
  ]

  return (
    <group position={c.position} rotation={[0, c.rotationY, 0]}>
      {legs.map(([x, z], i) => (
        <BevelBox
          key={i}
          size={[c.legSize, legHeight, c.legSize]}
          position={[x, legHeight / 2, z]}
          color={palette.dark}
        />
      ))}
      <BevelBox
        size={[c.seatSize, c.seatThickness, c.seatSize]}
        position={[0, c.seatHeight - c.seatThickness / 2, 0]}
        color={palette.sage}
      />
      <BevelBox
        size={[c.seatSize, c.backHeight, c.backThickness]}
        position={[0, c.seatHeight + c.backHeight / 2, -half + c.backThickness / 2]}
        color={palette.sage}
      />
    </group>
  )
}
