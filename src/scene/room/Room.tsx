import { useMemo, type ReactElement } from 'react'
import { sceneConfig } from '../../config/sceneConfig'
import { useLayoutItems, useRoomBounds } from '../../state/layoutStore'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { fitWindow } from '../window/windowFit'

type Opening = { from: number; to: number }
type Piece = { from: number; to: number; opening: boolean }

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

/**
 * 水泥地面 + 后墙/左墙（按 layout 里的城市窗开洞）+ 墙顶压边 + 踢脚线。
 * 房间尺寸来自 layout.json 的 room（编辑器里可以用滑杆改），左后角固定。
 */
export function Room() {
  const { palette } = useSceneParams()
  const items = useLayoutItems()
  const b = useRoomBounds()
  const r = sceneConfig.room
  const cw = sceneConfig.cityWindow
  const wt = r.wallThickness
  const wallBottom = -r.floorThickness
  const trimY = r.wallHeight + r.trimHeight / 2
  const trimT = wt + r.trimOverhang * 2
  const backZ = b.minZ - wt / 2
  const leftX = b.minX - wt / 2

  const { back, left } = useMemo(() => {
    const back: Opening[] = []
    const left: Opening[] = []
    for (const it of items) {
      if (it.type !== 'cityWindow') continue
      const f = fitWindow(it, b)
      ;(f.left ? left : back).push({ from: f.center - f.width / 2, to: f.center + f.width / 2 })
    }
    return {
      // 后墙沿 X，向左多出一个墙厚盖住转角；左墙沿 Z
      back: cutWall(b.minX - wt, b.maxX, back),
      left: cutWall(b.minZ, b.maxZ, left),
    }
  }, [items, b, wt])

  /** 一段墙：整段是一整块；窗洞段只剩窗台以下和窗顶以上两块 */
  const wallPiece = (
    p: Piece,
    key: string,
    place: (center: number, length: number, y0: number, y1: number) => ReactElement,
  ) => {
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
        size={[b.width, r.floorThickness, b.depth]}
        position={[b.centerX, -r.floorThickness / 2, b.centerZ]}
        color={palette.concrete}
        castShadow={false}
      />

      {/* 后墙（-Z） */}
      {back.map((p, i) =>
        wallPiece(p, `b${i}`, (c, len, y0, y1) => (
          <BevelBox
            key={`b${i}-${y0}`}
            size={[len, y1 - y0, wt]}
            position={[c, (y0 + y1) / 2, backZ]}
            color={palette.wall}
          />
        )),
      )}
      {/* 左墙（-X） */}
      {left.map((p, i) =>
        wallPiece(p, `l${i}`, (c, len, y0, y1) => (
          <BevelBox
            key={`l${i}-${y0}`}
            size={[wt, y1 - y0, len]}
            position={[leftX, (y0 + y1) / 2, c]}
            color={palette.wall}
          />
        )),
      )}

      {/* 墙顶压边 */}
      <BevelBox
        tier="small"
        size={[b.width + wt + r.trimOverhang * 2, r.trimHeight, trimT]}
        position={[b.centerX - wt / 2, trimY, backZ]}
        color={palette.slate}
      />
      <BevelBox
        tier="small"
        size={[trimT, r.trimHeight, b.depth + r.trimOverhang]}
        position={[leftX, trimY, b.centerZ + r.trimOverhang / 2]}
        color={palette.slate}
      />

      {/* 踢脚线 */}
      <BevelBox
        tier="rod"
        size={[b.width, r.baseboardHeight, r.baseboardThickness]}
        position={[b.centerX, r.baseboardHeight / 2, b.minZ + r.baseboardThickness / 2]}
        color={palette.baseboard}
      />
      <BevelBox
        tier="rod"
        size={[r.baseboardThickness, r.baseboardHeight, b.depth]}
        position={[b.minX + r.baseboardThickness / 2, r.baseboardHeight / 2, b.centerZ]}
        color={palette.baseboard}
      />
    </group>
  )
}
