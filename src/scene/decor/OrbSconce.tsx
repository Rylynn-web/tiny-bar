import { useMemo } from 'react'
import { AdditiveBlending } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { getPoolTexture } from '../primitives/LightPool'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import type { CatalogProps } from '../catalogTypes'

const S = sceneConfig.decor.sconce

/**
 * 粉色发光球壁灯：金属圆底座 + 短杆 + 自发光球（夜晚亮、配合 Bloom，白天几乎不亮），
 * 墙上叠一圈很淡的假光晕。原点在墙面上、底座中心
 */
export function OrbSconce({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  // 单件灯的亮度倍数（编辑器里的「亮度」滑杆）
  const brightness = typeof props.brightness === 'number' ? props.brightness : 1
  const { glow } = useLighting()
  const halo = useMemo(() => getPoolTexture(), [])
  const color = palette[S.color]
  const ballZ = S.baseDepth + S.armLength + S.radius * 0.85
  return (
    <group>
      <RoundedCylinder
        tier="small"
        radius={S.baseRadius}
        height={S.baseDepth}
        color={palette.steel}
        surface={<Metal />}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <RoundedCylinder
        tier="rod"
        radius={S.armRadius}
        height={S.armLength + S.radius * 0.5}
        color={palette.steel}
        surface={<Metal />}
        position={[0, 0, S.baseDepth]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh position={[0, 0, ballZ]} userData={{ noMerge: true }}>
        <sphereGeometry args={[S.radius, 24, 16]} />
        <Glow color={color} group="sconce" multiplier={brightness} />
      </mesh>
      {/* 墙上的光晕：叠加混合的径向渐变，强度跟时段的 glow 倍率 */}
      <mesh position={[0, 0, 0.003]} renderOrder={1} raycast={() => null} userData={{ editorIgnore: true }}>
        <planeGeometry args={[S.haloRadius * 2, S.haloRadius * 2]} />
        <meshBasicMaterial
          map={halo}
          color={color}
          transparent
          opacity={Math.min(1, S.haloOpacity * glow * brightness)}
          blending={AdditiveBlending}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
    </group>
  )
}
