import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { MeshBasicMaterial, type Group, type Mesh, type Object3D } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats, type Seat } from '../config/seatConfig'
import { takeSeat } from '../state/flowActions'
import { useGuests } from '../state/guests'
import { useSceneParams } from '../state/sceneParams'
import { isTap, markInteractiveHit } from './interaction/tap'

const C = sceneConfig.seatPicker

/** 一件家具下面真正画出来的网格（合并后的、没被隐藏的） */
function visibleMeshes(root: Object3D) {
  const out: Mesh[] = []
  root.traverse((o) => {
    const m = o as Mesh & { isInstancedMesh?: boolean }
    if (!m.isMesh || m.isInstancedMesh) return
    for (let p: Object3D | null = m; p && p !== root.parent; p = p.parent) if (!p.visible) return
    out.push(m)
  })
  return out
}

/**
 * 选座阶段：每件还有空位的可坐家具套一层半透明绿色蒙版（复制家具本身的形状），慢慢呼吸；
 * 点蒙版就坐到这件家具上离点击处最近的空位。离开选座阶段这个组件就卸载，家具恢复原样。
 */
export function SeatPicker() {
  const scene = useThree((s) => s.scene)
  const seats = useSeats()
  const guests = useGuests()
  const { palette } = useSceneParams()
  const group = useRef<Group>(null)

  // 每件家具上空着的座位
  const free = useMemo(() => {
    const map = new Map<string, Seat[]>()
    for (const s of seats) {
      if (guests[s.id]) continue
      const list = map.get(s.itemId)
      if (list) list.push(s)
      else map.set(s.itemId, [s])
    }
    return map
  }, [seats, guests])

  const material = useMemo(
    () => new MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    [],
  )
  useEffect(() => {
    material.color.set(palette[C.color])
  }, [material, palette])
  useEffect(() => () => material.dispose(), [material])

  // 找到家具的网格（网格合并是异步的，等一帧再找，之后每秒复查一次）
  const [targets, setTargets] = useState<{ itemId: string; meshes: Mesh[] }[]>([])
  useEffect(() => {
    const collect = () => {
      const list: { itemId: string; meshes: Mesh[] }[] = []
      scene.traverse((o) => {
        const id = o.userData.layoutItemId as string | undefined
        if (id && free.has(id)) list.push({ itemId: id, meshes: visibleMeshes(o) })
      })
      setTargets((prev) => {
        const same =
          prev.length === list.length &&
          prev.every((p, i) => p.itemId === list[i].itemId && p.meshes.length === list[i].meshes.length && p.meshes.every((m, j) => m === list[i].meshes[j]))
        return same ? prev : list
      })
    }
    const raf = requestAnimationFrame(collect)
    const id = setInterval(collect, 1000)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(id)
    }
  }, [scene, free])

  // 蒙版跟着家具（编辑时家具会动）；不透明度呼吸
  useFrame(({ clock }) => {
    const t = (Math.sin((clock.elapsedTime / C.pulseSeconds) * Math.PI * 2) + 1) / 2
    material.opacity = C.opacity[0] + (C.opacity[1] - C.opacity[0]) * t
    const g = group.current
    if (!g) return
    let i = 0
    for (const { meshes } of targets)
      for (const m of meshes) {
        const o = g.children[i++] as Mesh | undefined
        if (o) o.matrix.copy(m.matrixWorld)
      }
  })

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    markInteractiveHit()
    e.stopPropagation()
  }
  const onClick = (itemId: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (!isTap(e)) return
    const list = free.get(itemId)
    if (!list?.length) return
    // 沙发这种一件有两个座位的：坐离点击处最近的那个空位
    const p = e.point
    const best = list.reduce((a, b) =>
      Math.hypot(a.position[0] - p.x, a.position[2] - p.z) <= Math.hypot(b.position[0] - p.x, b.position[2] - p.z) ? a : b,
    )
    takeSeat(best.id)
  }

  return (
    <group ref={group}>
      {targets.flatMap(({ itemId, meshes }) =>
        meshes.map((m) => (
          <mesh
            key={m.uuid}
            geometry={m.geometry}
            material={material}
            matrixAutoUpdate={false}
            matrix={m.matrixWorld.clone()}
            renderOrder={5}
            onPointerDown={onDown}
            onClick={onClick(itemId)}
          />
        )),
      )}
    </group>
  )
}
