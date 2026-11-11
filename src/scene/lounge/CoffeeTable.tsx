import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'

const C = sceneConfig.lounge.coffeeTable

/** 黑色矮茶几：内收的底座 + 厚台面。原点在地面中心，长边沿 X */
export function CoffeeTable() {
  const { palette } = useSceneParams()
  const [, bh] = C.baseSize
  return (
    <group>
      <BevelBox size={C.baseSize} position={[0, bh / 2, 0]} color={palette.dark} />
      <BevelBox tier="small" size={C.topSize} position={[0, bh + C.topSize[1] / 2, 0]} color={palette.dark} />
    </group>
  )
}
