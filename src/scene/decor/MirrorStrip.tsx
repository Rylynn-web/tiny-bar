import { MathUtils } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Metal } from '../primitives/Metal'
import type { CatalogProps } from '../catalogTypes'
import { num } from './useArt'

const M = sceneConfig.decor.mirror

/**
 * 一排横向小长方形镜子：高光泽金属 + 只渲染一次的环境贴图，不做实时反射。
 * 原点在墙面上、整排的中心。props.count = 块数
 */
export function MirrorStrip({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const count = Math.round(MathUtils.clamp(num(props, 'count', M.count), M.countRange[0], M.countRange[1]))
  const total = count * M.width + (count - 1) * M.gap
  return (
    <group>
      {Array.from({ length: count }, (_, i) => (
        <BevelBox
          key={i}
          tier="rod"
          size={[M.width, M.height, M.depth]}
          position={[-total / 2 + M.width / 2 + i * (M.width + M.gap), 0, M.wallGap + M.depth / 2]}
          color={palette.steel}
          surface={<Metal finish="mirror" />}
        />
      ))}
    </group>
  )
}
