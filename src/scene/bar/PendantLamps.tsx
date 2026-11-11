import { DoubleSide } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { LightPool } from '../primitives/LightPool'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { useLathe } from '../primitives/useLathe'

const B = sceneConfig.bar
const P = B.pendants

/** 吧台上方 3 盏吊灯：吊线 + 绿色宽扁灯罩 + 镀铬灯头 + 自发光灯泡（不投射真实光） */
export function PendantLamps() {
  const { palette } = useSceneParams()
  const shadeGeo = useLathe(P.shade, 48)
  const shadeHeight = Math.max(...P.shade.map((p) => p[1]))
  const shadeTop = P.shadeBottom + shadeHeight
  const cordLength = P.hangFrom - shadeTop
  const z = B.counter.frontZ - B.counter.depth / 2

  return (
    <>
      {P.xs.map((x) => (
        <group key={x} position={[x, 0, z]}>
          <mesh position={[0, shadeTop + cordLength / 2, 0]}>
            <cylinderGeometry args={[P.cordRadius, P.cordRadius, cordLength, 6]} />
            <Matte color={palette.dark} />
          </mesh>
          {/* 开口薄壳：双面渲染 + 双面投影，避免月牙形影子 */}
          <mesh geometry={shadeGeo} position={[0, P.shadeBottom, 0]} castShadow receiveShadow>
            <Matte color={palette.pendantGreen} side={DoubleSide} shadowSide={DoubleSide} />
          </mesh>
          <mesh position={[0, shadeTop, 0]} castShadow>
            <sphereGeometry args={[P.capRadius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <Metal />
          </mesh>
          <mesh position={[0, P.shadeBottom, 0]}>
            <sphereGeometry args={[P.bulbRadius, 16, 12]} />
            <Glow color={palette.warmLight} group="bulb" />
          </mesh>
          <LightPool position={[0, B.counter.height, 0]} radius={P.poolRadius} />
        </group>
      ))}
    </>
  )
}
