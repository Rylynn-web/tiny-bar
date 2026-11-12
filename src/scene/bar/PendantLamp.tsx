import { DoubleSide } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { LightPool } from '../primitives/LightPool'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { useLathe } from '../primitives/useLathe'
import { paletteColor } from '../paletteColor'
import type { CatalogProps } from '../catalogTypes'
import { LightCone } from '../primitives/LightCone'

const P = sceneConfig.bar.pendants

/**
 * 吊灯（地面物件：在水平面上摆放，高度固定）：吊线 + 绿色宽扁灯罩 + 镀铬灯头 + 自发光灯泡 + 下方假光斑。
 * 不投射真实光。原点在灯正下方的地面。
 */
export function PendantLamp({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const shadeGeo = useLathe(P.shade, 48)
  const shadeHeight = Math.max(...P.shade.map((p) => p[1]))
  const shadeTop = P.shadeBottom + shadeHeight
  const cordLength = P.hangFrom - shadeTop
  // 单件灯的亮度倍数（编辑器里的「亮度」滑杆）
  const brightness = typeof props.brightness === 'number' ? props.brightness : 1

  return (
    <group>
      <mesh position={[0, shadeTop + cordLength / 2, 0]}>
        <cylinderGeometry args={[P.cordRadius, P.cordRadius, cordLength, 6]} />
        <Matte color={palette.dark} />
      </mesh>
      {/* 开口薄壳：双面渲染 + 双面投影，避免月牙形影子 */}
      <mesh geometry={shadeGeo} position={[0, P.shadeBottom, 0]} castShadow receiveShadow>
        <Matte color={paletteColor(palette, props.color, 'pendantGreen')} side={DoubleSide} shadowSide={DoubleSide} />
      </mesh>
      <mesh position={[0, shadeTop, 0]} castShadow>
        <sphereGeometry args={[P.capRadius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Metal />
      </mesh>
      <mesh position={[0, P.shadeBottom, 0]}>
        <sphereGeometry args={[P.bulbRadius, 16, 12]} />
        <Glow color={palette.warmLight} group="bulb" multiplier={brightness} />
      </mesh>
      {/* 灯罩下沿往下的光锥，落到台面上的光斑 */}
      <LightCone
        position={[0, P.shadeBottom, 0]}
        radiusTop={P.shade[0][0] * 0.95}
        radiusBottom={P.poolRadius * sceneConfig.lightCone.bottomRatio}
        height={P.shadeBottom - P.poolHeight}
        group="conePendant"
        multiplier={brightness}
      />
      <LightPool position={[0, P.poolHeight, 0]} radius={P.poolRadius} multiplier={brightness} />
    </group>
  )
}
