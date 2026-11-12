import type { Texture } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import type { CatalogProps } from '../catalogTypes'
import { useArtTexture } from './useArt'

const D = sceneConfig.decor
const C = D.canvas

/**
 * 画布：有一点厚度和圆角，离墙一条缝（AO 会在边缘压出淡阴影），正面贴生成的画。
 * 原点在墙面上、画面中心；局部 +Z 朝室内。
 */
export function ArtCanvas({ width, height, map }: { width: number; height: number; map: Texture }) {
  const { palette } = useSceneParams()
  const inset = C.radius * 2
  return (
    <group>
      <BevelBox
        tier="small"
        radius={C.radius}
        size={[width, height, C.depth]}
        position={[0, 0, C.wallGap + C.depth / 2]}
        color={palette[C.edge]}
      />
      <mesh position={[0, 0, C.wallGap + C.depth + 0.0008]} receiveShadow>
        <planeGeometry args={[width - inset, height - inset]} />
        <meshStandardMaterial
          map={map}
          roughness={C.roughness}
          metalness={0}
          envMapIntensity={sceneConfig.material.envMapIntensity}
        />
      </mesh>
    </group>
  )
}

/** 竖幅：深色底，模糊的彩色光斑 */
export function ArtBokeh({ props }: CatalogProps) {
  const B = D.bokeh
  const map = useArtTexture('bokeh', props, B.width / B.height)
  return <ArtCanvas width={B.width} height={B.height} map={map} />
}

/** 方幅：青蓝径向渐变底，中间一个柔和发光的浅色圆 */
export function ArtOrb({ props }: CatalogProps) {
  const O = D.orb
  const map = useArtTexture('orb', props, 1)
  return <ArtCanvas width={O.size} height={O.size} map={map} />
}

/** 小幅：几条平涂色带加一个圆形太阳 */
export function ArtHorizon({ props }: CatalogProps) {
  const H = D.horizon
  const map = useArtTexture('horizon', props, H.width / H.height)
  return <ArtCanvas width={H.width} height={H.height} map={map} />
}
