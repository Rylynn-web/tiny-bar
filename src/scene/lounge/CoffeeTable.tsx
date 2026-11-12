import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { paletteColor } from '../paletteColor'
import type { CatalogProps, SurfaceAnchor } from '../catalogTypes'

const C = sceneConfig.lounge.coffeeTable

/** 黑色矮茶几：内收的底座 + 厚台面。原点在地面中心，长边沿 X */
export function CoffeeTable({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const [, bh] = C.baseSize
  return (
    <group>
      <BevelBox size={C.baseSize} position={[0, bh / 2, 0]} color={paletteColor(palette, props.color, 'dark')} />
      <BevelBox tier="small" size={C.topSize} position={[0, bh + C.topSize[1] / 2, 0]} color={paletteColor(palette, props.color, 'dark')} />
    </group>
  )
}

CoffeeTable.surfaces = [
  { min: [-C.topSize[0] / 2, -C.topSize[2] / 2], max: [C.topSize[0] / 2, C.topSize[2] / 2], height: C.baseSize[1] + C.topSize[1] },
] satisfies SurfaceAnchor[]
