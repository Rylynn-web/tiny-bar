import { useMemo } from 'react'
import { MathUtils } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import type { CatalogProps } from '../catalogTypes'
import { paletteColor } from '../paletteColor'
import { getMatTexture } from '../decor/artTextures'
import { num } from '../decor/useArt'

const M = sceneConfig.doorMat

/**
 * 门口地毯：长方形薄地毯，顶面是程序生成的图案，只接收阴影。原点在地面中心。
 * props：color 底色（调色板键名）、pattern 图案（0 格子 / 1 波浪线 / 2 条纹）、seed 换一种排布
 */
export function DoorMat({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const base = paletteColor(palette, props.color, 'navy')
  const pattern = Math.round(MathUtils.clamp(num(props, 'pattern', 0), 0, M.patterns - 1))
  const seed = num(props, 'seed', 1)
  const map = useMemo(
    () => getMatTexture(pattern, seed, base, palette[M.lineColor], palette[M.accent], M.width / M.depth, M.textureSize),
    [pattern, seed, base, palette],
  )
  return (
    <group>
      <BevelBox
        tier="rod"
        size={[M.width, M.thickness, M.depth]}
        position={[0, M.thickness / 2, 0]}
        color={base}
        castShadow={false}
      />
      <mesh position={[0, M.thickness + 0.0008, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[M.width - 0.006, M.depth - 0.006]} />
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
