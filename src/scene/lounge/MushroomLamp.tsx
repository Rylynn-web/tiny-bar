import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { LightPool } from '../primitives/LightPool'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import type { CatalogProps } from '../catalogTypes'

const M = sceneConfig.lounge.mushroomLamp

/** 蘑菇台灯：奶白灯柱 + 自发光半球灯头 + 所在台面上的光斑。原点在底面中心（放在台面上时 y = 台面高度） */
export function MushroomLamp({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  // 单件灯的亮度倍数（编辑器里的「亮度」滑杆）
  const brightness = typeof props.brightness === 'number' ? props.brightness : 1
  return (
    <group>
      <RoundedCylinder radius={M.stemRadius} height={M.stemHeight} color={palette.cream} tier="rod" />
      <group position={[0, M.stemHeight, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[M.headRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Glow color={palette.warmLight} group="mushroomLamp" multiplier={brightness} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[M.headRadius, 24]} />
          <Glow color={palette.warmLight} group="mushroomLamp" multiplier={brightness} />
        </mesh>
      </group>
      <LightPool position={[0, sceneConfig.lounge.poolLift, 0]} radius={M.poolRadius} group="poolMushroom" multiplier={brightness} />
    </group>
  )
}
