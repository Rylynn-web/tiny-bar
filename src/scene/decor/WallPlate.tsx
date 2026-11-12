import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import type { CatalogProps } from '../catalogTypes'
import { useArtTexture } from './useArt'

const P = sceneConfig.decor.plate

/** 墙上的圆盘：哑光盘体 + 正面同心圆图案。原点在墙面上、圆盘中心 */
export function WallPlate({ props }: CatalogProps) {
  const { palette, bevel } = useSceneParams()
  const map = useArtTexture('plate', props, 1, P.textureSize)
  // 正面图案比盘面小一圈，留出盘沿的倒角
  const face = P.radius - bevel * sceneConfig.bevelTiers.small
  return (
    <group>
      <RoundedCylinder
        tier="small"
        radius={P.radius}
        height={P.thickness}
        color={palette[P.base]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <mesh position={[0, 0, P.thickness + 0.0008]} receiveShadow>
        <circleGeometry args={[face, 48]} />
        <meshStandardMaterial
          map={map}
          roughness={sceneConfig.material.roughness}
          metalness={0}
          envMapIntensity={sceneConfig.material.envMapIntensity}
        />
      </mesh>
    </group>
  )
}
