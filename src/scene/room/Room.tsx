import { useMemo, type ReactElement } from 'react'
import type { LayoutItem } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import { useLayoutItems } from '../../state/layoutStore'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { windowWidth } from '../window/windowSize'

type Opening = { from: number; to: number }
type Piece = { from: number; to: number; opening: boolean }

/** 窗户贴在哪面墙：朝向 ≈ 90° 为左墙，否则为后墙 */
function onLeftWall(item: LayoutItem) {
  const d = ((((item.rotationY % 360) + 360) % 360) + 180) % 360 - 180
  return Math.abs(d - 90) < 45
}

/** 把一面墙沿长度方向切成"整段"和"窗洞段" */
function cutWall(from: number, to: number, openings: Opening[]): Piece[] {
  const pieces: Piece[] = []
  let cursor = from
  for (const o of [...openings].sort((a, b) => a.from - b.from)) {
    const a = Math.max(o.from, cursor)
    const b = Math.min(o.to, to)
    if (b <= a) continue
    if (a > cursor) pieces.push({ from: cursor, to: a, opening: false })
    pieces.push({ from: a, to: b, opening: true })
    cursor = b
  }
  if (cursor < to) pieces.push({ from: cursor, to, opening: false })
  return pieces
}

/** 水泥地面 + 后墙/左墙（按 layout 里的城市窗开洞）+ 墙顶压边 + 踢脚线（门等墙面物件在 layout.json 里） */
export function Room() {
  const { palette } = useSceneParams()
  const items = useLayoutItems()
  const r = sceneConfig.room
  const hw = r.width / 2
  const hd = r.depth / 2
  const trimY = r.wallHeight + r.trimHeight / 2
  const trimT = r.wallThickness + r.trimOverhang * 2
  const cw = sceneConfig.cityWindow
  const wallBottom = -r.floorThickness

  const { back, left } = useMemo(() => {
    const back: Opening[] = []
    const left: Opening[] = []
    for (const it of items) {
      if (it.type !== 'cityWindow') continue
      const half = windowWidth(it.props) / 2
      if (onLeftWall(it)) left.push({ from: it.position[2] - half, to: it.position[2] + half })
      else back.push({ from: it.position[0] - half, to: it.position[0] + half })
    }
    return {
      // 后墙沿 X，向左多出一个墙厚盖住转角；左墙沿 Z
      back: cutWall(-hw - r.wallThickness, hw, back),
      left: cutWall(-hd, hd, left),
    }
  }, [items, hw, hd, r.wallThickness])

  /** 一段墙：整段是一整块；窗洞段只剩窗台以下和窗顶以上两块 */
  const wallPiece = (p: Piece, key: string, place: (center: number, length: number, y0: number, y1: number) => ReactElement) => {
    const len = p.to - p.from
    const c = (p.from + p.to) / 2
    if (!p.opening) return place(c, len, wallBottom, r.wallHeight)
    return (
      <group key={key}>
        {place(c, len, wallBottom, cw.sillHeight)}
        {place(c, len, cw.headHeight, r.wallHeight)}
      </group>
    )
  }

  return (
    <group>
      <BevelBox
        size={[r.width, r.floorThickness, r.depth]}
        position={[0, -r.floorThickness / 2, 0]}
        color={palette.concrete}
        castShadow={false}
      />

      {/* 后墙（-Z） */}
      {back.map((p, i) =>
        wallPiece(p, `b${i}`, (c, len, y0, y1) => (
          <BevelBox
            key={`b${i}-${y0}`}
            size={[len, y1 - y0, r.wallThickness]}
            position={[c, (y0 + y1) / 2, -hd - r.wallThickness / 2]}
            color={palette.wall}
          />
        )),
      )}
      {/* 左墙（-X） */}
      {left.map((p, i) =>
        wallPiece(p, `l${i}`, (c, len, y0, y1) => (
          <BevelBox
            key={`l${i}-${y0}`}
            size={[r.wallThickness, y1 - y0, len]}
            position={[-hw - r.wallThickness / 2, (y0 + y1) / 2, c]}
            color={palette.wall}
          />
        )),
      )}

      {/* 墙顶压边 */}
      <BevelBox
        tier="small"
        size={[r.width + r.wallThickness + r.trimOverhang * 2, r.trimHeight, trimT]}
        position={[-r.wallThickness / 2, trimY, -hd - r.wallThickness / 2]}
        color={palette.slate}
      />
      <BevelBox
        tier="small"
        size={[trimT, r.trimHeight, r.depth + r.trimOverhang]}
        position={[-hw - r.wallThickness / 2, trimY, r.trimOverhang / 2]}
        color={palette.slate}
      />

      {/* 踢脚线 */}
      <BevelBox
        tier="rod"
        size={[r.width, r.baseboardHeight, r.baseboardThickness]}
        position={[0, r.baseboardHeight / 2, -hd + r.baseboardThickness / 2]}
        color={palette.baseboard}
      />
      <BevelBox
        tier="rod"
        size={[r.baseboardThickness, r.baseboardHeight, r.depth]}
        position={[-hw + r.baseboardThickness / 2, r.baseboardHeight / 2, 0]}
        color={palette.baseboard}
      />

    </group>
  )
}
