import { useEffect, useMemo } from 'react'
import { BoxGeometry, MathUtils, PlaneGeometry } from 'three'
import { Instance, Instances } from '@react-three/drei'
import { sceneConfig } from '../../config/sceneConfig'
import { resolveQuality } from '../../state/quality'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { seededRandom } from '../primitives/canvasTexture'
import type { CatalogProps } from '../catalogTypes'
import { getAtlasTexture } from './artTextures'
import { num } from './useArt'

const L = sceneConfig.decor.bookLedge
const trayGeometry = new BoxGeometry(1, 1, 1)
const range = (rand: () => number, [lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo)

type Book = { row: number; x: number; width: number; height: number; thickness: number; open: boolean }

/** 在一层里随机排几本书：宽度、高度、间距不同，偶尔一本摊开的杂志 */
function layoutBooks(width: number, rows: number, seed: number) {
  const rand = seededRandom(seed * 4099 + 17)
  const books: Book[] = []
  const usable = width - L.postInset * 2 - 0.04
  for (let row = 0; row < rows; row++) {
    const count = Math.round(range(rand, L.booksPerRow))
    const items = Array.from({ length: count }, () => {
      const open = rand() < L.openChance
      const w = range(rand, L.bookWidth) * (open ? 1.8 : 1)
      return { open, width: w, height: range(rand, L.bookHeight) * (open ? 0.85 : 1), thickness: range(rand, L.bookThickness) }
    })
    // 太挤就少放几本
    while (items.length > 1 && items.reduce((a, b) => a + b.width, 0) > usable * 0.92) items.pop()
    const total = items.reduce((a, b) => a + b.width, 0)
    const slack = (usable - total) / (items.length + 1)
    let x = -usable / 2
    for (const it of items) {
      // 间距随机一点，看起来是随手摆的
      x += slack * (0.5 + rand())
      books.push({ row, x: Math.min(x + it.width / 2, usable / 2 - it.width / 2), ...it })
      x += it.width
    }
  }
  return books
}

/**
 * 墙挂书架：每层一条半透明彩色亚克力托槽（底板 + 前挡板），前面一根镀铬横杆，两端立柱和红色小球，
 * 书和杂志封面朝外、往墙上靠着放。封面只用米色 / 黑白 / 深蓝三组颜色，图案原创、没有文字。
 * 封面拼成一张贴图（一次绘制），托槽一组实例，金属件和书身各自合并。原点在墙面上、最下层托槽底面中心。
 * props：rows 层数、width 宽度（米）、seed 换一种摆法和封面
 */
export function BookLedge({ props }: CatalogProps) {
  const { palette, quality } = useSceneParams()
  const rows = Math.round(MathUtils.clamp(num(props, 'rows', L.rows), L.rowsRange[0], L.rowsRange[1]))
  const width = MathUtils.clamp(num(props, 'width', L.width), L.widthRange[0], L.widthRange[1])
  const seed = num(props, 'seed', 1)
  const cellPx = resolveQuality(quality) === 'high' ? L.textureCell * 2 : L.textureCell
  const maxLean = MathUtils.degToRad(L.bookLeanDeg)
  // 书底边站在挡板后面；往墙靠的角度不超过 maxLean，并保证书顶刚好碰到墙、不穿进去
  const bookZ = (b: Book) => L.trayDepth - L.trayThickness - b.thickness - 0.004
  const leanOf = (b: Book) => Math.min(maxLean, Math.asin(MathUtils.clamp((bookZ(b) - 0.004) / b.height, 0, 1)))
  // 第 r 层（0 = 最上面）的底面高度
  const rowY = (r: number) => (rows - 1 - r) * L.rowGap

  const { books, covers, map } = useMemo(() => {
    const books = layoutBooks(width, rows, seed)
    const atlas = getAtlasTexture(
      books.map((b, i) => ({
        kind: b.open ? ('spread' as const) : ('cover' as const),
        seed: seed * 131 + i,
        // 封面颜色组：按顺序轮换（米色 / 黑白 / 深蓝），起点随种子
        paletteSeed: seed + i,
        aspect: b.width / b.height,
      })),
      palette,
      cellPx,
    )
    const covers = books.map((b, i) => {
      const g = new PlaneGeometry(b.width, b.height)
      const [u0, u1] = atlas.ranges[i]
      const uv = g.attributes.uv
      for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
      return g
    })
    return { books, covers, map: atlas.texture }
  }, [width, rows, seed, palette, cellPx])
  useEffect(() => () => covers.forEach((g) => g.dispose()), [covers])

  const half = width / 2
  const postX = half - L.postInset
  const railLen = width + L.railOverhang * 2
  const ball = palette[L.ballColor]
  const rowsIdx = Array.from({ length: rows }, (_, r) => r)

  return (
    <group>
      {/* 托槽：底板 + 前挡板，半透明彩色亚克力（一组实例） */}
      <Instances geometry={trayGeometry} limit={rows * 2} range={rows * 2} renderOrder={4} castShadow={false}>
        <meshStandardMaterial
          color="#ffffff"
          transparent
          opacity={L.trayOpacity}
          roughness={sceneConfig.glass.roughness}
          metalness={0}
          depthWrite={false}
        />
        {rowsIdx.flatMap((r) => {
          const color = palette[L.trayColors[r % L.trayColors.length]]
          const y = rowY(r)
          return [
            <Instance
              key={`b${r}`}
              position={[0, y + L.trayThickness / 2, L.trayDepth / 2]}
              scale={[width, L.trayThickness, L.trayDepth]}
              color={color}
            />,
            <Instance
              key={`f${r}`}
              position={[0, y + L.lipHeight / 2, L.trayDepth - L.trayThickness / 2]}
              scale={[width, L.lipHeight, L.trayThickness]}
              color={color}
            />,
          ]
        })}
      </Instances>

      {rowsIdx.map((r) => {
        const y = rowY(r)
        return (
          <group key={r} position={[0, y, 0]}>
            {/* 镀铬横杆 + 两端立柱 + 卡扣 */}
            <RoundedCylinder
              tier="rod"
              radius={L.railRadius}
              height={railLen}
              color={palette.steel}
              surface={<Metal />}
              position={[-railLen / 2, L.railY, L.railZ]}
              rotation={[0, 0, -Math.PI / 2]}
            />
            {[-1, 1].map((s) => (
              <group key={s}>
                <RoundedCylinder
                  tier="rod"
                  radius={L.postRadius}
                  height={L.postTop - L.postBottom}
                  color={palette.steel}
                  surface={<Metal />}
                  position={[s * postX, L.postBottom, L.railZ]}
                />
                <mesh position={[s * (postX - 0.12), L.railY, L.railZ]} scale={L.clipSize} geometry={trayGeometry}>
                  <Metal />
                </mesh>
                {/* 杆头和托槽两端的红色小球 */}
                {[L.railY, L.trayThickness * 2].map((by, k) => (
                  <mesh key={k} position={[s * (railLen / 2), by, k === 0 ? L.railZ : L.trayDepth * 0.6]}>
                    <sphereGeometry args={[L.ballRadius, 10, 8]} />
                    <Matte color={ball} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        )
      })}

      {/* 书 / 杂志：底边站在托槽里、挡板后面，顶部往墙靠 */}
      {books.map((b, i) => (
        <group
          key={i}
          position={[b.x, rowY(b.row) + L.trayThickness, bookZ(b)]}
          rotation={[-leanOf(b), 0, 0]}
        >
          {/* 书身：很薄，倒角在这个视距下看不出来，用普通方块省面数（每本 12 个面） */}
          <mesh position={[0, b.height / 2, b.thickness / 2]} scale={[b.width, b.height, b.thickness]} geometry={trayGeometry}>
            <Matte color={palette[L.pageColor]} />
          </mesh>
          <mesh geometry={covers[i]} position={[0, b.height / 2, b.thickness + 0.0006]}>
            <meshStandardMaterial
              map={map}
              roughness={sceneConfig.material.roughness}
              metalness={0}
              envMapIntensity={sceneConfig.material.envMapIntensity}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
