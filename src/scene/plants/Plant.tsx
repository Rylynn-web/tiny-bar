import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { DoubleSide } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from '../primitives/Matte'
import type { CatalogProps } from '../catalogTypes'
import { getPlantParts, soilHeight, type PotStyle } from './plantGeometry'
import { Planter } from './Planter'

const P = sceneConfig.plants
export type Species = keyof typeof P.species

function speciesOf(v: unknown): Species {
  return typeof v === 'string' && v in P.species ? (v as Species) : 'monstera'
}

/** 模型文件缺失或加载失败时什么也不画（比如还没下载的香蕉树），不让整个场景报错 */
class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[植物] 模型加载失败，先不显示：', err)
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function PlantModel({ species }: { species: Species }) {
  const spec = P.species[species]
  const { scene } = useGLTF(spec.url)
  const { palette } = useSceneParams()
  const parts = useMemo(() => getPlantParts(species, scene, spec.height, spec.baseAnchor), [species, scene, spec])
  const leaf = { side: DoubleSide, shadowSide: DoubleSide } as const
  return (
    <group>
      <mesh geometry={parts.leaf} castShadow receiveShadow>
        <Matte color={palette.leaf} {...leaf} />
      </mesh>
      <mesh geometry={parts.leafDark} castShadow receiveShadow>
        <Matte color={palette.leafDark} {...leaf} />
      </mesh>
      <mesh geometry={parts.stem} castShadow receiveShadow>
        <Matte color={palette.wood} {...leaf} />
      </mesh>
    </group>
  )
}

/**
 * 盆栽（地面物件；放在家具上时 y = 台面高度）：代码做的花盆 + 外部植物模型。
 * props.species = monstera | banana | pothos；props.pot 覆盖默认花盆样式。原点在盆底中心
 */
export function Plant({ props }: CatalogProps) {
  const species = speciesOf(props.species)
  const pot: PotStyle =
    typeof props.pot === 'string' && props.pot in P.pots ? (props.pot as PotStyle) : (P.species[species].pot as PotStyle)
  return (
    <group>
      <Planter style={pot} />
      <group position={[0, soilHeight(pot), 0]}>
        <ModelBoundary>
          <Suspense fallback={null}>
            <PlantModel species={species} />
          </Suspense>
        </ModelBoundary>
      </group>
    </group>
  )
}

// 已经下载到仓库里的模型提前加载（香蕉树要用户自己下载，不预加载）
useGLTF.preload(P.species.monstera.url)
useGLTF.preload(P.species.pothos.url)
