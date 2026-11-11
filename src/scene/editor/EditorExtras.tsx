import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line, PivotControls } from '@react-three/drei'
import { Box3, Euler, MathUtils, Matrix4, Quaternion, Vector3, type Mesh } from 'three'
import { useSeats } from '../../config/seatConfig'
import { editorConfig } from '../../config/editorConfig'
import { setControlsEnabled } from '../../state/cameraActions'
import { getLayoutItems, useLayoutItems } from '../../state/layoutStore'
import { catalog } from '../catalog'
import { constrain, normalizeDeg, round3 } from './dragMath'
import { beginTransient, endTransient, getEditorState, getObjects, transientUpdate, useEditor } from './editorStore'

const E = editorConfig

/** 座位锚点（小球 + 朝向箭头）和邻座连线 */
function SeatGizmos() {
  const seats = useSeats()
  const lines = useMemo(() => {
    const out: [Vector3, Vector3][] = []
    const byId = new Map(seats.map((s) => [s.id, s]))
    for (const s of seats) {
      for (const n of s.neighbors) {
        if (s.id < n) {
          const o = byId.get(n)!
          out.push([new Vector3(...s.position), new Vector3(...o.position)])
        }
      }
    }
    return out
  }, [seats])

  return (
    <group>
      {seats.map((s) => (
        <group key={s.id} position={s.position} rotation={[0, s.rotationY, 0]}>
          <mesh renderOrder={10}>
            <sphereGeometry args={[E.seatMarkerRadius, 12, 8]} />
            <meshBasicMaterial color={E.seatColor} depthTest={false} transparent />
          </mesh>
          {/* 箭头指向座位朝向（局部 +Z） */}
          <mesh position={[0, 0, E.seatArrowLength / 2]} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
            <coneGeometry args={[E.seatMarkerRadius * 0.7, E.seatArrowLength, 10]} />
            <meshBasicMaterial color={E.seatColor} depthTest={false} transparent />
          </mesh>
        </group>
      ))}
      {lines.map(([a, b], i) => (
        <Line key={i} points={[a, b]} color={E.neighborLineColor} lineWidth={E.neighborLineWidth} dashed depthTest={false} />
      ))}
    </group>
  )
}

/** 选中的物件和其他物件（同为地面或同为墙面、参与碰撞）的包围盒重叠时，罩一个半透明红盒 */
function OverlapHint() {
  const items = useLayoutItems()
  const selectedId = useEditor((s) => s.selectedId)
  const mesh = useRef<Mesh>(null)
  const last = useRef<unknown>(null)
  const box = useMemo(() => new Box3(), [])
  const other = useMemo(() => new Box3(), [])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    const key = `${selectedId}`
    // 布局或选中变化后才重新计算
    if (last.current === items && m.userData.key === key) return
    last.current = items
    m.userData.key = key
    m.visible = false
    const sel = items.find((i) => i.id === selectedId)
    const entry = sel && catalog[sel.type]
    const obj = sel && getObjects().get(sel.id)
    if (!sel || !entry || entry.collide === false || !obj) return
    box.setFromObject(obj).expandByScalar(-E.overlapTolerance)
    for (const it of items) {
      if (it.id === sel.id) continue
      const e = catalog[it.type]
      if (!e || e.collide === false || e.mount !== entry.mount) continue
      const o = getObjects().get(it.id)
      if (!o) continue
      other.setFromObject(o).expandByScalar(-E.overlapTolerance)
      if (box.intersectsBox(other)) {
        box.expandByScalar(E.overlapTolerance)
        box.getCenter(m.position)
        box.getSize(m.scale)
        m.visible = true
        return
      }
    }
  })

  return (
    <mesh ref={mesh} visible={false} renderOrder={9}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={E.overlapColor} transparent opacity={E.overlapOpacity} depthWrite={false} />
    </mesh>
  )
}

/** 精确调整：drei PivotControls。地面物件只开放水平移动和绕竖直轴旋转；墙面物件只能沿墙移动 */
function PivotEditor() {
  const items = useLayoutItems()
  const selectedId = useEditor((s) => s.selectedId)
  const pivotMode = useEditor((s) => s.pivotMode)
  const item = items.find((i) => i.id === selectedId)
  const entry = item && catalog[item.type]

  const matrix = useMemo(() => {
    if (!item) return new Matrix4()
    return new Matrix4().compose(
      new Vector3(...item.position),
      new Quaternion().setFromEuler(new Euler(0, MathUtils.degToRad(item.rotationY), 0)),
      new Vector3(1, 1, 1),
    )
  }, [item])

  const offsets = useRef<{ min: Vector3; max: Vector3 } | null>(null)

  if (!pivotMode || !item || !entry) return null
  const wall = entry.mount === 'wall'
  const left = wall && Math.abs(normalizeDeg(item.rotationY) - 90) < 45
  const activeAxes: [boolean, boolean, boolean] = !wall ? [true, false, true] : left ? [false, true, true] : [true, true, false]

  return (
    <PivotControls
      matrix={matrix}
      autoTransform={false}
      activeAxes={activeAxes}
      disableRotations={wall}
      disableScaling
      depthTest={false}
      fixed
      scale={E.pivotScale}
      onDragStart={() => {
        const obj = getObjects().get(item.id)
        const box = obj ? new Box3().setFromObject(obj) : null
        const pos = new Vector3(...item.position)
        offsets.current = box ? { min: box.min.sub(pos), max: box.max.sub(pos) } : null
        setControlsEnabled(false)
        beginTransient()
      }}
      onDrag={(_l, _dl, w) => {
        const id = getEditorState().selectedId
        const current = getLayoutItems().find((i) => i.id === id)
        if (!current || !offsets.current) return
        const p = new Vector3()
        const q = new Quaternion()
        w.decompose(p, q, new Vector3())
        const yaw = MathUtils.radToDeg(new Euler().setFromQuaternion(q, 'YXZ').y)
        const position = constrain(current, entry.mount, p, offsets.current.min, offsets.current.max, true)
        transientUpdate(current.id, {
          position: round3(position),
          ...(wall ? {} : { rotationY: Math.round(normalizeDeg(yaw) * 10) / 10 }),
        })
      }}
      onDragEnd={() => {
        endTransient()
        setControlsEnabled(true)
      }}
    />
  )
}

export function EditorExtras() {
  return (
    <>
      <SeatGizmos />
      <OverlapHint />
      <PivotEditor />
    </>
  )
}
