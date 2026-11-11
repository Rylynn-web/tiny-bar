import { useMemo } from 'react'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Metal } from '../primitives/Metal'
import type { CatalogProps, SeatAnchor } from '../catalogTypes'
import { paletteColor } from '../paletteColor'

const S = sceneConfig.lounge.sofa
const ARC_STEPS = 6

// 各部件尺寸（局部坐标：宽沿 X，正面朝 +Z，原点在地面中心）
const baseTop = S.liftHeight + S.baseHeight
const innerWidth = S.width - 2 * S.armWidth
const cushionWidth = (innerWidth - S.cushionGap) / 2
const cushionDepth = S.depth - S.backDepth
const cushionZ = -S.depth / 2 + S.backDepth + cushionDepth / 2
const cushionX = cushionWidth / 2 + S.cushionGap / 2
const seatTop = baseTop + S.cushionThickness

/** 侧面圆角矩形的管框路径（在 YZ 平面，x 固定） */
function framePath(x: number) {
  const r = S.frameCorner
  const z0 = -S.depth / 2 + S.frameInset
  const z1 = S.depth / 2 - S.frameInset
  const y0 = S.frameRadius
  const y1 = S.frameHeight
  const corners: [number, number, number][] = [
    [z1 - r, y0 + r, -Math.PI / 2], // 前下
    [z1 - r, y1 - r, 0], // 前上
    [z0 + r, y1 - r, Math.PI / 2], // 后上
    [z0 + r, y0 + r, Math.PI], // 后下
  ]
  const pts: Vector3[] = []
  for (const [cz, cy, start] of corners) {
    for (let i = 0; i <= ARC_STEPS; i++) {
      const a = start + (i / ARC_STEPS) * (Math.PI / 2)
      pts.push(new Vector3(x, cy + r * Math.sin(a), cz + r * Math.cos(a)))
    }
  }
  return new CatmullRomCurve3(pts, true, 'centripetal')
}

/** 双人沙发：锈红圆角块（底座、两个坐垫、靠背、扶手）+ 两侧不锈钢管框 + 撞色靠垫。props.color 为调色板键名 */
export function Sofa({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const color = paletteColor(palette, props.color, 'rust')
  const frames = useMemo(
    () =>
      [-1, 1].map(
        (side) => new TubeGeometry(framePath(side * (S.width / 2 + S.frameOutset)), 96, S.frameRadius, 8, true),
      ),
    [],
  )
  const p = S.pillow

  return (
    <group>
      {frames.map((g, i) => (
        <mesh key={i} geometry={g} castShadow>
          <Metal />
        </mesh>
      ))}
      <BevelBox size={[S.width, S.baseHeight, S.depth]} position={[0, S.liftHeight + S.baseHeight / 2, 0]} color={color} />
      {[-1, 1].map((side) => (
        <BevelBox
          key={`arm${side}`}
          size={[S.armWidth, S.armHeight, S.depth]}
          position={[side * (S.width / 2 - S.armWidth / 2), baseTop + S.armHeight / 2, 0]}
          color={color}
        />
      ))}
      <BevelBox
        size={[innerWidth, S.backHeight, S.backDepth]}
        position={[0, baseTop + S.backHeight / 2, -S.depth / 2 + S.backDepth / 2]}
        color={color}
      />
      {[-1, 1].map((side) => (
        <BevelBox
          key={`cushion${side}`}
          size={[cushionWidth, S.cushionThickness, cushionDepth]}
          position={[side * cushionX, baseTop + S.cushionThickness / 2, cushionZ]}
          color={color}
        />
      ))}
      {/* 靠垫：深蓝底 + 奶白方块，斜靠在靠背上 */}
      <group
        position={[p.side * cushionX, seatTop + p.size[1] / 2, -S.depth / 2 + S.backDepth + p.size[2] / 2]}
        rotation={[-p.tilt, 0, 0]}
      >
        <BevelBox tier="small" size={p.size} color={palette.navy} />
        <BevelBox
          tier="rod"
          size={p.insetSize}
          position={[p.size[0] / 2 - p.insetSize[0] / 2 - p.insetSize[2], -p.size[1] / 2 + p.insetSize[1] / 2 + p.insetSize[2], p.size[2] / 2]}
          color={palette.cream}
          castShadow={false}
        />
      </group>
    </group>
  )
}

/** 座位锚点：两个坐垫表面，面朝沙发正面 */
Sofa.seats = [-1, 1].map((side) => ({
  position: [side * cushionX, seatTop, cushionZ + S.seatForward],
  rotationY: 0,
  pose: 'sofa',
})) satisfies SeatAnchor[]
