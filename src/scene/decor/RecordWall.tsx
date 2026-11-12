import { useEffect, useMemo } from 'react'
import { CircleGeometry, CylinderGeometry, MathUtils, PlaneGeometry } from 'three'
import { Instance, Instances } from '@react-three/drei'
import { sceneConfig } from '../../config/sceneConfig'
import { resolveQuality } from '../../state/quality'
import { useSceneParams } from '../../state/sceneParams'
import { InstancedMatte } from '../primitives/InstancedLathe'
import { seededRandom } from '../primitives/canvasTexture'
import type { CatalogProps } from '../catalogTypes'
import { getAtlasTexture } from './artTextures'
import { num } from './useArt'

const R = sceneConfig.decor.recordWall
const G = sceneConfig.glass
const M = sceneConfig.metal

// 共用几何体：黑胶盘（圆柱，轴朝 +Z）、亚克力板、支钉
const discGeometry = new CylinderGeometry(R.discRadius, R.discRadius, R.discThickness, 48).rotateX(Math.PI / 2)
const acrylicGeometry = new PlaneGeometry(1, 1)
const standoffGeometry = new CylinderGeometry(R.standoffRadius, R.standoffRadius, R.acrylicZ + R.acrylicDepth, 10).rotateX(
  Math.PI / 2,
)

/** 平面几何体的 UV 映射到拼图贴图里的一段 [u0, u1] */
function remapU<T extends PlaneGeometry | CircleGeometry>(g: T, [u0, u1]: [number, number]) {
  const uv = g.attributes.uv
  for (let k = 0; k < uv.count; k++) uv.setX(k, u0 + uv.getX(k) * (u1 - u0))
  return g
}

/**
 * 唱片墙（参考图里的亚克力唱片展示格）：cols × rows 格，每格夹一张封套或一张黑胶，四角有金属支钉。
 * 封套图案和唱片贴标是原创抽象图，由 seed / paletteSeed 生成，全部拼在一张贴图上（合并成一次绘制）。
 * 黑胶盘、亚克力板、支钉各用一组实例。原点在墙面上、整组中心
 */
export function RecordWall({ props }: CatalogProps) {
  const { palette, quality } = useSceneParams()
  const cols = Math.round(MathUtils.clamp(num(props, 'cols', R.cols), R.colsRange[0], R.colsRange[1]))
  const rows = Math.round(MathUtils.clamp(num(props, 'rows', R.rows), R.rowsRange[0], R.rowsRange[1]))
  const seed = num(props, 'seed', 1)
  const paletteSeed = num(props, 'paletteSeed', 0)
  const cellPx = resolveQuality(quality) === 'high' ? R.textureCell * 2 : R.textureCell

  const layout = useMemo(() => {
    const rand = seededRandom(seed * 977 + 5)
    const step = R.cell + R.gap
    const cells: { x: number; y: number; disc: boolean }[] = []
    // 封套和唱片交替出现，起始的是哪种由种子决定
    const start = rand() < 0.5 ? 0 : 1
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        cells.push({
          x: (c - (cols - 1) / 2) * step,
          y: ((rows - 1) / 2 - r) * step,
          disc: (r + c + start) % 2 === 1,
        })
    const atlas = getAtlasTexture(
      cells.map((cell, i) => ({
        kind: cell.disc ? ('disc' as const) : ('sleeve' as const),
        seed: seed * 53 + i,
        paletteSeed: paletteSeed + i,
        aspect: 1,
      })),
      palette,
      cellPx,
    )
    const faces = cells.map((cell, i) =>
      cell.disc
        ? remapU(new CircleGeometry(R.discRadius, 48), atlas.ranges[i])
        : remapU(new PlaneGeometry(R.sleeve, R.sleeve), atlas.ranges[i]),
    )
    return { cells, faces, map: atlas.texture }
  }, [cols, rows, seed, paletteSeed, palette, cellPx])
  useEffect(() => () => layout.faces.forEach((f) => f.dispose()), [layout])

  const { cells, faces, map } = layout
  const half = R.cell / 2 - R.standoffInset
  const discs = cells.filter((c) => c.disc).map((c) => ({ position: [c.x, c.y, R.itemZ] as [number, number, number], color: palette.dark }))

  return (
    <group>
      {/* 封套 / 唱片正面：共用一张拼图贴图，会被合并成一次绘制 */}
      {cells.map((c, i) => (
        <mesh
          key={i}
          geometry={faces[i]}
          position={[c.x, c.y, R.itemZ + (c.disc ? R.discThickness / 2 + 0.0006 : 0)]}
          receiveShadow
        >
          <meshStandardMaterial
            map={map}
            transparent={false}
            alphaTest={0.5}
            roughness={sceneConfig.material.roughness}
            metalness={0}
            envMapIntensity={sceneConfig.material.envMapIntensity}
          />
        </mesh>
      ))}

      {/* 黑胶盘的厚度 */}
      {discs.length > 0 && <InstancedMatte geometry={discGeometry} items={discs} />}

      {/* 亚克力板：半透明，一组实例 */}
      <Instances geometry={acrylicGeometry} limit={cells.length} range={cells.length} renderOrder={4}>
        <meshStandardMaterial
          color={palette.steel}
          transparent
          opacity={G.opacity * 0.6}
          roughness={G.roughness}
          metalness={0}
          depthWrite={false}
        />
        {cells.map((c, i) => (
          <Instance key={i} position={[c.x, c.y, R.acrylicZ + R.acrylicDepth]} scale={[R.cell, R.cell, 1]} />
        ))}
      </Instances>

      {/* 四角金属支钉 */}
      <Instances geometry={standoffGeometry} limit={cells.length * 4} range={cells.length * 4} castShadow={false}>
        <meshStandardMaterial
          color={palette.steel}
          metalness={M.metalness}
          roughness={M.roughness}
          envMapIntensity={M.envMapIntensity}
        />
        {cells.flatMap((c, i) =>
          [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(([sx, sy], k) => (
            <Instance
              key={`${i}-${k}`}
              position={[c.x + sx * half, c.y + sy * half, (R.acrylicZ + R.acrylicDepth) / 2]}
            />
          )),
        )}
      </Instances>
    </group>
  )
}
