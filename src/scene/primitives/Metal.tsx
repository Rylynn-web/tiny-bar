import type { Side } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'

type Props = {
  /** 不锈钢/镀铬用 steel，黄铜用 brass */
  kind?: 'steel' | 'brass'
  /** 开口薄壳（灯罩）传 DoubleSide */
  side?: Side
  shadowSide?: Side
  /** mirror = 镜子：同一套金属，粗糙度低得多（只反射环境柔光板，不做实时反射） */
  finish?: 'brushed' | 'mirror'
}

/** 金属白名单材质（不锈钢 / 镀铬 / 黄铜）。依赖场景里的环境反射，否则会发黑 */
export function Metal({ kind = 'steel', side, shadowSide, finish = 'brushed' }: Props) {
  const { palette } = useSceneParams()
  const m = sceneConfig.metal
  return (
    <meshStandardMaterial
      color={palette[kind]}
      metalness={m.metalness}
      roughness={finish === 'mirror' ? m.mirrorRoughness : m.roughness}
      envMapIntensity={finish === 'mirror' ? m.mirrorEnvMapIntensity : m.envMapIntensity}
      side={side}
      shadowSide={shadowSide}
    />
  )
}
