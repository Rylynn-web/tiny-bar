import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import type { CatalogProps } from '../catalogTypes'
import { paletteColor } from '../paletteColor'

/** 圆地毯：薄圆盘，只接收阴影。props.color 为调色板键名 */
export function RoundRug({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const r = sceneConfig.roundRug
  return (
    <RoundedCylinder
      radius={r.radius}
      height={r.thickness}
      color={paletteColor(palette, props.color, 'cream')}
      tier="rod"
      segments={sceneConfig.detail.cylinderSegments.large}
      castShadow={false}
    />
  )
}
