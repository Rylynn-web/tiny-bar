import { DoubleSide } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'
import type { PotStyle } from './plantGeometry'

const P = sceneConfig.plants

/** 盆身轮廓：盆底 → 外壁 → 盆口 → 内壁一小段（开口薄壳） */
function potProfile(style: PotStyle): [number, number][] {
  const p = P.pots[style]
  const rim = Math.min(P.rimThickness, p.radiusTop / 4)
  return [
    [0.001, 0],
    [p.radiusBottom, 0],
    [p.radiusTop, p.height],
    [p.radiusTop - rim, p.height],
    [p.radiusTop - rim, p.height - P.soilDrop * 2],
  ]
}

/** 花盆（代码生成）：不锈钢落地盆或奶白陶盆 + 深色土面。原点在盆底中心 */
export function Planter({ style }: { style: PotStyle }) {
  const { palette } = useSceneParams()
  const p = P.pots[style]
  const geo = useLathe(potProfile(style), sceneConfig.detail.cylinderSegments.small)
  const steel = style !== 'ceramic'
  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        {steel ? (
          <Metal side={DoubleSide} shadowSide={DoubleSide} />
        ) : (
          <Matte color={palette.cream} side={DoubleSide} shadowSide={DoubleSide} />
        )}
      </mesh>
      <RoundedCylinder
        radius={p.radiusTop * P.soilRadiusRatio}
        height={P.soilDrop}
        position={[0, p.height - P.soilDrop * 2, 0]}
        color={palette.dark}
        tier="rod"
        castShadow={false}
      />
    </group>
  )
}
