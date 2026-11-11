import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'

const S = sceneConfig.bar.stools

type Props = { position: [number, number, number] }

/** 吧凳：不锈钢底座、立柱、脚踏环 + 黑色坐垫。原点在地面 */
export function BarStool({ position }: Props) {
  const { palette } = useSceneParams()
  const baseGeo = useLathe(S.base)
  const baseTop = Math.max(...S.base.map((p) => p[1]))
  const cushionBottom = S.seatHeight - S.cushionThickness
  const columnHeight = cushionBottom - baseTop

  return (
    <group position={position}>
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
