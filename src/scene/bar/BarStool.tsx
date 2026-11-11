import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'
import type { SeatAnchor } from '../catalogTypes'

const S = sceneConfig.bar.stools

/** 吧凳：不锈钢底座、立柱、脚踏环 + 黑色坐垫。原点在地面，局部 +Z 为坐上去时面朝的方向 */
export function BarStool() {
  const { palette } = useSceneParams()
  const baseGeo = useLathe(S.base)
  const baseTop = Math.max(...S.base.map((p) => p[1]))
  const cushionBottom = S.seatHeight - S.cushionThickness
  const columnHeight = cushionBottom - baseTop

  return (
    <group>
      <mesh geometry={baseGeo} castShadow receiveShadow>
        <Metal />
      </mesh>
      <mesh position={[0, baseTop + columnHeight / 2, 0]} castShadow>
        <cylinderGeometry args={[S.columnRadius, S.columnRadius, columnHeight, 16]} />
        <Metal />
      </mesh>
      <mesh position={[0, S.footRingY, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[S.footRingRadius, S.footRingTube, 6, 32]} />
        <Metal />
      </mesh>
      <RoundedCylinder
        radius={S.cushionRadius}
        height={S.cushionThickness}
        position={[0, cushionBottom, 0]}
        color={palette.dark}
        tier="small"
      />
    </group>
  )
}

/** 座位锚点：坐垫表面中心 */
BarStool.seats = [{ position: [0, S.seatHeight, 0], rotationY: 0, pose: 'stool' }] satisfies SeatAnchor[]
