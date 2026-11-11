import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { paletteColor } from '../paletteColor'
import type { CatalogProps } from '../catalogTypes'

const L = sceneConfig.lounge.stackLamp

/** 叠环台灯：几个圆环叠起来，顶上一颗小球，整体自发光。原点在底面中心。props.color 为调色板键名 */
export function StackLamp({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const color = paletteColor(palette, props.color, 'orange')
  const topY = L.tube + (L.rings - 1) * L.spacing + L.tube
  return (
    <group>
      {Array.from({ length: L.rings }, (_, i) => (
        <mesh key={i} position={[0, L.tube + i * L.spacing, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[L.ringRadius, L.tube, 12, 28]} />
          <Glow color={color} group="lamp" />
        </mesh>
      ))}
      <mesh position={[0, topY + L.topRadius * 0.6, 0]} castShadow>
        <sphereGeometry args={[L.topRadius, 20, 14]} />
        <Glow color={color} group="lamp" />
      </mesh>
    </group>
  )
}
