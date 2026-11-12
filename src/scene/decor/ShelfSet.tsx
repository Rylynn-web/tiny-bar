import { useEffect, useMemo } from 'react'
import { DoubleSide, MathUtils, PlaneGeometry, TorusGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { resolveQuality } from '../../state/quality'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Matte } from '../primitives/Matte'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'
import type { CatalogProps } from '../catalogTypes'
import { getAtlasTexture } from './artTextures'
import { num } from './useArt'

const S = sceneConfig.decor.shelfSet
const ornamentGeometry = new TorusGeometry(S.ornament.radius, S.ornament.tube, 12, 32)

/**
 * 两层浮动层板 + 2–3 个相框（框里是抽象色块）+ 插一枝花的小花瓶 + 一个小圆环摆件，整组一起拖动。
 * 原点在墙面上、下层板的板面高度。props.seed / paletteSeed 决定相框里的图案
 */
export function ShelfSet({ props }: CatalogProps) {
  const { palette, quality } = useSceneParams()
  const seed = num(props, 'seed', 1)
  const paletteSeed = num(props, 'paletteSeed', 0)
  const texSize = Math.min(S.frameTextureSize, sceneConfig.decor.textureSize[resolveQuality(quality)])
  const vaseGeo = useLathe(S.vase.profile, sceneConfig.detail.smallLatheSegments * 2)
  const vaseTop = Math.max(...S.vase.profile.map((p) => p[1]))
  const lean = MathUtils.degToRad(S.frameLeanDeg)
  const shelfY = [0, S.gap]
  const itemZ = S.depth * 0.5

  // 几个相框里的图拼成一张贴图：平面材质相同，会被合并成一次绘制
  const { map, frames } = useMemo(() => {
    const b = S.frameBorder
    const atlas = getAtlasTexture(
      S.frames.map((f, i) => ({
        kind: 'frame' as const,
        seed: seed * 31 + i,
        paletteSeed: paletteSeed + i,
        aspect: (f.width - b * 2) / (f.height - b * 2),
      })),
      palette,
      texSize,
    )
    const frames = S.frames.map((f, i) => {
      const g = new PlaneGeometry(f.width - b * 2, f.height - b * 2)
      const [u0, u1] = atlas.ranges[i]
      const uv = g.attributes.uv
      for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
      return { ...f, geometry: g }
    })
    return { map: atlas.texture, frames }
  }, [seed, paletteSeed, palette, texSize])
  useEffect(() => () => frames.forEach((f) => f.geometry.dispose()), [frames])

  return (
    <group>
      {shelfY.map((y, i) => (
        <BevelBox
          key={i}
          tier="small"
          size={[S.width, S.thickness, S.depth]}
          position={[0, y - S.thickness / 2, S.depth / 2]}
          color={palette[S.color]}
        />
      ))}

      {/* 相框：底边站在板上，顶部稍微往墙靠 */}
      {frames.map((f, i) => {
        return (
          <group key={i} position={[f.x, shelfY[f.shelf], S.depth * 0.35]} rotation={[-lean, 0, 0]}>
            <BevelBox
              tier="rod"
              size={[f.width, f.height, S.frameDepth]}
              position={[0, f.height / 2, 0]}
              color={palette[f.color]}
              castShadow={false}
            />
            <mesh geometry={f.geometry} position={[0, f.height / 2, S.frameDepth / 2 + 0.0008]}>
              <meshStandardMaterial map={map} roughness={sceneConfig.material.roughness} metalness={0} />
            </mesh>
          </group>
        )
      })}

      {/* 小花瓶 + 一枝花 */}
      <group position={[S.vase.x, 0, itemZ]}>
        <mesh geometry={vaseGeo} receiveShadow>
          <Matte color={palette[S.vase.color]} side={DoubleSide} shadowSide={DoubleSide} />
        </mesh>
        <group position={[0, vaseTop * 0.8, 0]} rotation={[0, 0, -0.12]}>
          <RoundedCylinder tier="rod" radius={S.vase.stemRadius} height={S.vase.stemLength} color={palette.leafDark} />
          <mesh position={[0, S.vase.stemLength, 0]}>
            <sphereGeometry args={[S.vase.flowerRadius, 12, 8]} />
            <Matte color={palette[S.vase.flowerColor]} />
          </mesh>
        </group>
      </group>

      {/* 小摆件：立着的圆环 */}
      <mesh
        geometry={ornamentGeometry}
        position={[S.ornament.x, S.ornament.radius + S.ornament.tube, itemZ]}
        receiveShadow
      >
        <Matte color={palette[S.ornament.color]} />
      </mesh>
    </group>
  )
}
