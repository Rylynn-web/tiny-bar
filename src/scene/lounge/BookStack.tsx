import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'

const S = sceneConfig.lounge.bookStack

/** 一摞书：几本扁方块叠放，各自稍微错开角度。原点在底面中心 */
export function BookStack() {
  const { palette } = useSceneParams()
  let y = 0
  return (
    <group>
      {S.books.map((b, i) => {
        const cy = y + b.size[1] / 2
        y += b.size[1]
        return (
          <BevelBox
            key={i}
            tier="rod"
            size={b.size}
            position={[0, cy, 0]}
            rotation={[0, b.yaw, 0]}
            color={palette[b.color]}
            castShadow={i === S.books.length - 1}
          />
        )
      })}
    </group>
  )
}
