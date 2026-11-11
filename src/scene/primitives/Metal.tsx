import type { Side } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'

type Props = {
  /** 不锈钢/镀铬用 steel，黄铜用 brass */
  kind?: 'steel' | 'brass'
  /** 开口薄壳（灯罩）传 DoubleSide */
  side?: Side
  shadowSide?: Side
}

/** 金属白名单材质（不锈钢 / 镀铬 / 黄铜）。依赖场景里的环境反射，否则会发黑 */
export function Metal({ kind = 'steel', side, shadowSide }: Props) {
  const { palette } = useSceneParams()
  const m = sceneConfig.metal
  return (
    <meshStandardMaterial
      color={palette[kind]}
      metalness={m.metalness}
      roughness={m.roughness}
      envMapIntensity={m.envMapIntensity}
      side={side}
      shadowSide={shadowSide}
    />
  )
}
