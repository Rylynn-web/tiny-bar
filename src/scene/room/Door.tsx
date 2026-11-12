import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Glass } from '../primitives/Glass'
import { Metal } from '../primitives/Metal'
import { paletteColor } from '../paletteColor'
import type { CatalogProps } from '../catalogTypes'

/** 门（墙面物件）：深色门板 + 圆形舷窗 + 金属门把。原点在墙面上、门底边中点，局部 +Z 朝向室内 */
export function Door({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const d = sceneConfig.door
  const front = d.thickness + d.surfaceOffset

  return (
    <group>
      <BevelBox
        tier="small"
        size={[d.width, d.height, d.thickness]}
        position={[0, d.height / 2, d.thickness / 2]}
        color={paletteColor(palette, props.color, 'slate')}
      />

      {/* 舷窗：金属圈 + 半透明玻璃 */}
      <mesh position={[0, d.portholeY, front]} castShadow>
        <torusGeometry args={[d.portholeRadius, d.portholeRing, 8, 32]} />
        <Metal />
      </mesh>
      <mesh position={[0, d.portholeY, front - d.surfaceOffset * 2]}>
        <circleGeometry args={[d.portholeRadius, 40]} />
        <Glass color={palette.steel} />
      </mesh>

      {/* 门把：底座 + 横杆 */}
      <group position={[d.handleX, d.handleY, front]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[d.handleRoseRadius, d.handleRoseRadius, d.handleRoseDepth, 20]} />
          <Metal />
        </mesh>
        <mesh position={[0, 0, d.handleStemLength / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[d.handleBarRadius, d.handleBarRadius, d.handleStemLength, 10]} />
          <Metal />
        </mesh>
        <mesh
          position={[d.handleBarLength / 2, 0, d.handleStemLength]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <capsuleGeometry args={[d.handleBarRadius, d.handleBarLength, 4, 10]} />
          <Metal />
        </mesh>
      </group>
    </group>
  )
}
