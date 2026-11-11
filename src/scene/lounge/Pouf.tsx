import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import type { CatalogProps, SeatAnchor } from '../catalogTypes'
import { paletteColor } from '../paletteColor'

const P = sceneConfig.lounge.pouf

/** 方凳：大圆角的软方块。原点在地面中心，+Z 为坐上去时面朝的方向。props.color 为调色板键名 */
export function Pouf({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  return (
    <BevelBox
      size={P.size}
      radius={P.radius}
      position={[0, P.size[1] / 2, 0]}
      color={paletteColor(palette, props.color, 'cream')}
    />
  )
}

/** 座位锚点：凳面中心 */
Pouf.seats = [{ position: [0, P.size[1], 0], rotationY: 0, pose: 'pouf' }] satisfies SeatAnchor[]
