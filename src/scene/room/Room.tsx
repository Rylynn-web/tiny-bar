import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, type Group } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useLayoutItems, useRoomBounds } from '../../state/layoutStore'
import { useSceneParams } from '../../state/sceneParams'
import { setRaycastable, wallState } from '../../state/wallVisibility'
import { BevelBox } from '../primitives/BevelBox'
import { fitWindow } from '../window/windowFit'
import type { SideWall as Side } from './walls'

type Opening = { from: number; to: number }
type Piece = { from: number; to: number; opening: boolean }
/** 一块墙：沿墙方向 [from, to]，高度 [y0, y1] */
type Block = { from: number; to: number; y0: number; y1: number }

const r = sceneConfig.room
const cw = sceneConfig.cityWindow
const wt = r.wallThickness
const wallBottom = -r.floorThickness

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

/** 整段是一整块；窗洞段只剩窗台以下和窗顶以上两块 */
function toBlocks(pieces: Piece[]): Block[] {
  return pieces.flatMap((p): Block[] =>
    p.opening
      ? [
          { from: p.from, to: p.to, y0: wallBottom, y1: cw.sillHeight },
          { from: p.from, to: p.to, y0: cw.headHeight, y1: r.wallHeight },
        ]
      : [{ from: p.from, to: p.to, y0: wallBottom, y1: r.wallHeight }],
  )
}

// 隐形投影墙的材质：不写颜色、不写深度，只进阴影贴图（墙降下时光影不跳变）
const shadowOnly = <meshBasicMaterial colorWrite={false} depthWrite={false} />
const noMerge = { noMerge: true }

/**
 * 侧墙（左 / 右）：随视角平滑降到墙基。看得见的墙不投影，另有一份完整高度的隐形墙专门投影。
 * x = 墙中心线的 X；墙沿 Z 方向。
 */
function SideWall({ side, x, blocks, trimFrom, trimTo }: { side: Side; x: number; blocks: Block[]; trimFrom: number; trimTo: number }) {
  const { palette } = useSceneParams()
  const root = useRef<Group>(null)
  const parts = useRef<(Group | null)[]>([])
  const trim = useRef<Group>(null)
  const last = useRef(-1)
  const trimT = wt + r.trimOverhang * 2
  const trimLen = trimTo - trimFrom
  const trimZ = (trimFrom + trimTo) / 2

  useFrame(() => {
    const ratio = wallState.ratio[side]
    if (ratio === last.current) return
    const wasFull = last.current >= 1
    last.current = ratio
    const top = ratio * r.wallHeight
    blocks.forEach((b, i) => {
      const g = parts.current[i]
      if (!g) return
      // 每块从自己的底边往上压缩，顶端不超过当前墙高
      const s = MathUtils.clamp((top - b.y0) / (b.y1 - b.y0), 0, 1)
      g.visible = s > 1e-3
      g.scale.y = Math.max(s, 1e-3)
    })
    if (trim.current) trim.current.position.y = top
    // 降下的墙不参与点击检测，不挡后面的座位
    const full = ratio >= 1
    if (root.current && full !== wasFull) setRaycastable(root.current, full)
  })

  return (
    <group>
      <group ref={root}>
        {blocks.map((b, i) => (
          <group
            key={`${side}${i}`}
            ref={(g) => {
              parts.current[i] = g
            }}
            position={[0, b.y0, 0]}
          >
            <BevelBox
              size={[wt, b.y1 - b.y0, b.to - b.from]}
              position={[x, (b.y1 - b.y0) / 2, (b.from + b.to) / 2]}
              color={palette.wall}
              castShadow={false}
              userData={noMerge}
            />
          </group>
        ))}
        {/* 墙顶压边：跟着墙顶一起降 */}
        <group ref={trim} position={[0, r.wallHeight, 0]}>
          <BevelBox
            tier="small"
            size={[trimT, r.trimHeight, trimLen]}
            position={[x, r.trimHeight / 2, trimZ]}
            color={palette.slate}
            castShadow={false}
            userData={noMerge}
          />
        </group>
      </group>

      {/* 隐形投影墙：始终是完整高度 */}
      <group userData={{ editorIgnore: true }}>
        {blocks.map((b, i) => (
          <BevelBox
            key={`${side}s${i}`}
            tier="rod"
            size={[wt, b.y1 - b.y0, b.to - b.from]}
            position={[x, (b.y0 + b.y1) / 2, (b.from + b.to) / 2]}
            color={palette.wall}
            surface={shadowOnly}
            receiveShadow={false}
            raycast={() => null}
            userData={noMerge}
          />
        ))}
        <BevelBox
          tier="rod"
          size={[trimT, r.trimHeight, trimLen]}
          position={[x, r.wallHeight + r.trimHeight / 2, trimZ]}
          color={palette.slate}
          surface={shadowOnly}
          receiveShadow={false}
          raycast={() => null}
          userData={noMerge}
        />
      </group>
    </group>
  )
}

/**
 * 水泥地面 + 后墙 / 左墙 / 右墙（按 layout 里的城市窗开洞）+ 墙顶压边 + 踢脚线。前面敞开。
 * 房间尺寸来自 layout.json 的 room（编辑器里可以用滑杆改），左后角固定。
 * 后墙永远显示；左右墙按视角自动降低（见 wallVisibility）。
 */
export function Room() {
  const { palette } = useSceneParams()
  const items = useLayoutItems()
  const b = useRoomBounds()
  const trimY = r.wallHeight + r.trimHeight / 2
  const trimT = wt + r.trimOverhang * 2
  const backZ = b.minZ - wt / 2
  const leftX = b.minX - wt / 2
  const rightX = b.maxX + wt / 2

  const walls = useMemo(() => {
    const open: Record<'back' | 'left' | 'right', Opening[]> = { back: [], left: [], right: [] }
    for (const it of items) {
      if (it.type !== 'cityWindow') continue
      const f = fitWindow(it, b)
      open[f.wall].push({ from: f.center - f.width / 2, to: f.center + f.width / 2 })
    }
    return {
      // 后墙沿 X，两端各多出一个墙厚盖住转角；左右墙沿 Z
      back: cutWall(b.minX - wt, b.maxX + wt, open.back),
      left: toBlocks(cutWall(b.minZ, b.maxZ, open.left)),
      right: toBlocks(cutWall(b.minZ, b.maxZ, open.right)),
    }
  }, [items, b])

  return (
    <group>
      <BevelBox
        size={[b.width, r.floorThickness, b.depth]}
        position={[b.centerX, -r.floorThickness / 2, b.centerZ]}
        color={palette.concrete}
        castShadow={false}
      />

      {/* 后墙（-Z）：永远显示 */}
      {toBlocks(walls.back).map((p, i) => (
        <BevelBox
          key={`b${i}`}
          size={[p.to - p.from, p.y1 - p.y0, wt]}
          position={[(p.from + p.to) / 2, (p.y0 + p.y1) / 2, backZ]}
          color={palette.wall}
        />
      ))}
      <BevelBox
        tier="small"
        size={[b.width + wt * 2 + r.trimOverhang * 2, r.trimHeight, trimT]}
        position={[b.centerX, trimY, backZ]}
        color={palette.slate}
      />

      {/* 左墙（-X）、右墙（+X）：压边往前多出一点，盖住墙的前端面 */}
      <SideWall side="left" x={leftX} blocks={walls.left} trimFrom={b.minZ} trimTo={b.maxZ + r.trimOverhang} />
      <SideWall side="right" x={rightX} blocks={walls.right} trimFrom={b.minZ} trimTo={b.maxZ + r.trimOverhang} />

      {/* 踢脚线：比墙基矮，降墙时保留 */}
      <BevelBox
        tier="rod"
        size={[b.width, r.baseboardHeight, r.baseboardThickness]}
        position={[b.centerX, r.baseboardHeight / 2, b.minZ + r.baseboardThickness / 2]}
        color={palette.baseboard}
      />
      {[
        [b.minX + r.baseboardThickness / 2],
        [b.maxX - r.baseboardThickness / 2],
      ].map(([x], i) => (
        <BevelBox
          key={`bb${i}`}
          tier="rod"
          size={[r.baseboardThickness, r.baseboardHeight, b.depth]}
          position={[x, r.baseboardHeight / 2, b.centerZ]}
          color={palette.baseboard}
        />
      ))}
    </group>
  )
}
