import { useMemo, useState } from 'react'
import { BackSide, DoubleSide, LatheGeometry, Object3D, Vector2 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'
import { Matte } from '../primitives/Matte'

/** 吊灯：吊线 + 钟形灯罩 + 灯泡。夜晚由聚光灯（投影）+ 补光点亮 */
export function PendantLamp() {
  const { palette } = useSceneParams()
  const light = useLighting()
  const p = sceneConfig.pendant
  const l = sceneConfig.lamp
  const [tx, , tz] = sceneConfig.table.position
  const shadeTop = p.shadeBottom + p.shadeHeight
  const cordLength = p.hangFrom - shadeTop
  const bulbY = p.shadeBottom + p.bulbRadius * 0.6

  // 钟形灯罩轮廓：顶部小圆帽，向下张开
  const shadeGeometry = useMemo(() => {
    const r = p.shadeRadius
    const h = p.shadeHeight
    // 自下而上排列，法线才朝外
    const pts = [
      new Vector2(r, 0),
      new Vector2(r * 0.96, h * 0.12),
      new Vector2(r * 0.8, h * 0.45),
      new Vector2(r * 0.55, h * 0.8),
      new Vector2(r * 0.3, h * 0.97),
      new Vector2(r * 0.12, h),
    ]
    return new LatheGeometry(pts, 40)
  }, [p.shadeRadius, p.shadeHeight])

  // 聚光灯目标：桌面中心
  const [target] = useState(() => new Object3D())
  const lampOn = light.lampIntensity > 0

  return (
    <group position={[tx, 0, tz]}>
      <mesh position={[0, shadeTop + cordLength / 2, 0]}>
        <cylinderGeometry args={[p.cordRadius, p.cordRadius, cordLength, 8]} />
        <Matte color={palette.dark} />
      </mesh>

      {/* 外表面陶土色，内表面用暖光色，夜晚看起来是被照亮的 */}
      <group position={[0, p.shadeBottom, 0]}>
        <mesh geometry={shadeGeometry} castShadow>
          <Matte color={palette.terracotta} />
        </mesh>
        <mesh geometry={shadeGeometry} scale={0.985}>
          <meshStandardMaterial
            color={palette.warmLight}
            emissive={palette.warmLight}
            emissiveIntensity={light.bulbGlow * 0.15}
            roughness={1}
            side={BackSide}
          />
        </mesh>
      </group>

      <mesh position={[0, bulbY, 0]}>
        <sphereGeometry args={[p.bulbRadius, 20, 16]} />
        <meshStandardMaterial
          color={palette.warmLight}
          emissive={palette.warmLight}
          emissiveIntensity={light.bulbGlow}
          side={DoubleSide}
        />
      </mesh>

      <primitive object={target} position={[0, sceneConfig.table.height, 0]} />
      {lampOn && (
        <>
          <spotLight
            position={[0, bulbY, 0]}
            target={target}
            color={palette.warmLight}
            intensity={light.lampIntensity}
            angle={l.spotAngle}
            penumbra={l.spotPenumbra}
            decay={l.spotDecay}
            distance={l.spotDistance}
            castShadow
            shadow-mapSize={[sceneConfig.shadows.mapSize, sceneConfig.shadows.mapSize]}
            shadow-radius={sceneConfig.shadows.radius}
            shadow-bias={sceneConfig.shadows.bias}
            shadow-normalBias={sceneConfig.shadows.normalBias}
          />
          <pointLight
            position={[0, bulbY - 0.1, 0]}
            color={palette.warmLight}
            intensity={light.lampIntensity * l.fillRatio}
            decay={1}
          />
        </>
      )}
    </group>
  )
}
