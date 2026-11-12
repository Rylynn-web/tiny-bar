import { MathUtils } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import type { CatalogProps } from '../catalogTypes'
import { num } from './useArt'

const R = sceneConfig.decor.rod

/** 横跨墙面的细黑杆，两端各一个固定座。原点在墙面上、杆的中点。props.length = 杆长（米） */
export function WallRod({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const length = MathUtils.clamp(num(props, 'length', R.length), R.lengthRange[0], R.lengthRange[1])
  const color = palette[R.color]
  const z = R.mountLength
  return (
    <group>
      {/* 杆：圆柱轴从 Y 转到 X */}
      <RoundedCylinder
        tier="rod"
        radius={R.radius}
        height={length}
        color={color}
        position={[-length / 2, 0, z]}
        rotation={[0, 0, -Math.PI / 2]}
      />
      {[-1, 1].map((s) => (
        <RoundedCylinder
          key={s}
          tier="rod"
          radius={R.mountRadius}
          height={z}
          color={color}
          position={[s * (length / 2 - R.mountRadius * 2), 0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      ))}
    </group>
  )
}
