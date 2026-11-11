import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { LightPool } from '../primitives/LightPool'
import { RoundedCylinder } from '../primitives/RoundedCylinder'

const M = sceneConfig.lounge.mushroomLamp

/** 蘑菇台灯：奶白灯柱 + 自发光半球灯头 + 所在台面上的光斑。原点在底面中心（放在台面上时 y = 台面高度） */
export function MushroomLamp() {
  const { palette } = useSceneParams()
  return (
    <group>
      <RoundedCylinder radius={M.stemRadius} height={M.stemHeight} color={palette.cream} tier="rod" />
      <group position={[0, M.stemHeight, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[M.headRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Glow color={palette.warmLight} group="lamp" />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[M.headRadius, 24]} />
          <Glow color={palette.warmLight} group="lamp" />
        </mesh>
      </group>
      <LightPool position={[0, sceneConfig.lounge.poolLift, 0]} radius={M.poolRadius} />
    </group>
  )
}
