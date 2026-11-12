import { useMemo } from 'react'
import { BoxGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { InstancedMatte, type InstanceItem } from '../primitives/InstancedLathe'
import { seededRandom } from '../primitives/canvasTexture'
import { paletteColor } from '../paletteColor'
import type { CatalogProps } from '../catalogTypes'

const B = sceneConfig.lounge.bookshelf
// 书和唱片封套共用一个单位方块，按实例缩放（太小，不做倒角）
const unitBox = new BoxGeometry(1, 1, 1)

const t = B.board
const innerWidth = B.width - 2 * t

/** 书柜兼唱片柜：木框 + 中间隔板，上层放书、下层分格放唱片封套（都实例化）。原点在地面中心，背面朝 -Z 贴墙 */
export function Bookshelf({ props }: CatalogProps) {
  const { palette } = useSceneParams()

  const { books, records } = useMemo(() => {
    const rand = seededRandom(B.books.seed)
    const books: InstanceItem[] = []
    const bk = B.books
    let x = -innerWidth / 2 + bk.gap
    while (true) {
      const th = bk.thickness[0] + rand() * (bk.thickness[1] - bk.thickness[0])
      if (x + th > innerWidth / 2) break
      const h = bk.height[0] + rand() * (bk.height[1] - bk.height[0])
      books.push({
        position: [x + th / 2, B.midShelfY + t / 2 + h / 2, -B.depth / 2 + t / 2 + bk.depth / 2],
        scale: [th, h, bk.depth],
        color: palette[bk.colors[Math.floor(rand() * bk.colors.length)]],
      })
      x += th + bk.gap
    }

    const records: InstanceItem[] = []
    const rc = B.records
    const cubbyWidth = innerWidth / B.cubbies
    for (let c = 0; c < B.cubbies; c++) {
      const left = -innerWidth / 2 + cubbyWidth * c + t
      const usable = cubbyWidth - 2 * t
      for (let r = 0; r < rc.perCubby; r++) {
        records.push({
          position: [left + (usable / rc.perCubby) * (r + 0.5), t + rc.size[1] / 2, 0],
          scale: rc.size,
          color: palette[rc.colors[(c * rc.perCubby + r) % rc.colors.length]],
        })
      }
    }
    return { books, records }
  }, [palette])

  const wood = paletteColor(palette, props.color, 'wood')
  return (
    <group>
      {[-1, 1].map((s) => (
        <BevelBox key={s} tier="small" size={[t, B.height, B.depth]} position={[s * (B.width / 2 - t / 2), B.height / 2, 0]} color={wood} />
      ))}
      <BevelBox tier="small" size={[B.width, t, B.depth]} position={[0, B.height - t / 2, 0]} color={wood} />
      <BevelBox tier="small" size={[B.width, t, B.depth]} position={[0, t / 2, 0]} color={wood} />
      <BevelBox tier="small" size={[innerWidth, t, B.depth]} position={[0, B.midShelfY, 0]} color={wood} />
      <BevelBox tier="rod" size={[B.width, B.height, t / 2]} position={[0, B.height / 2, -B.depth / 2 + t / 4]} color={wood} />
      {Array.from({ length: B.cubbies - 1 }, (_, k) => (
        <BevelBox
          key={k}
          tier="rod"
          size={[t, B.midShelfY - t, B.depth - t]}
          position={[-innerWidth / 2 + (innerWidth * (k + 1)) / B.cubbies, (t + B.midShelfY) / 2, t / 2]}
          color={wood}
        />
      ))}
      <InstancedMatte geometry={unitBox} items={books} />
      <InstancedMatte geometry={unitBox} items={records} />
    </group>
  )
}
