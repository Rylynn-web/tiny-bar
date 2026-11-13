import { useEffect, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import type { Group, Material, Mesh, Object3D } from 'three'
import { isTap, markInteractiveHit } from './interaction/tap'

// 给家具"套一层"：复制某件家具真正画出来的网格（合并后的），用另一种材质盖在上面。
// 选座的绿色蒙版、唱机 / 唱片架的悬停高亮都用它；盖上去的这层同时负责接收点击。

export type OverlayTarget = { itemId: string; root: Object3D; meshes: Mesh[] }

/** 一件家具下面真正画出来的网格（合并后的、没被隐藏的） */
function visibleMeshes(root: Object3D) {
  const out: Mesh[] = []
  root.traverse((o) => {
    const m = o as Mesh & { isInstancedMesh?: boolean }
    if (!m.isMesh || m.isInstancedMesh || m.userData.overlay) return
    for (let p: Object3D | null = m; p && p !== root.parent; p = p.parent) if (!p.visible) return
    out.push(m)
  })
  return out
}

/** 整条父链都显示着（墙面物件会跟着侧墙一起隐藏） */
function shownInScene(o: Object3D) {
  for (let p: Object3D | null = o; p; p = p.parent) if (!p.visible) return false
  return true
}

/**
 * 找到这些家具（layout 的 id）的网格。网格合并是异步的，所以等一帧再找，之后每秒复查一次
 */
export function useItemMeshes(itemIds: string[]): OverlayTarget[] {
  const scene = useThree((s) => s.scene)
  const key = itemIds.join(',')
  const [targets, setTargets] = useState<OverlayTarget[]>([])
  useEffect(() => {
    const ids = new Set(key ? key.split(',') : [])
    const collect = () => {
      const list: OverlayTarget[] = []
      scene.traverse((o) => {
        const id = o.userData.layoutItemId as string | undefined
        if (id && ids.has(id)) list.push({ itemId: id, root: o, meshes: visibleMeshes(o) })
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
  }, [scene, key])
  return targets
}

type Props = {
  targets: OverlayTarget[]
  material: Material
  /** 每件家具单独的材质（比如悬停的那件高亮）；不给就都用 material */
  materialFor?: (itemId: string) => Material
  /** 点一下（拖动不算） */
  onTap?: (itemId: string, e: ThreeEvent<MouseEvent>) => void
  onHover?: (itemId: string | null) => void
  renderOrder?: number
}

/** 盖在家具上的那一层：跟着家具的位置（编辑器里会动），家具所在的墙隐藏时它也不显示、不接收点击 */
export function OverlayMeshes({ targets, material, materialFor, onTap, onHover, renderOrder = 5 }: Props) {
  const group = useRef<Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    let i = 0
    for (const { root, meshes } of targets) {
      const shown = shownInScene(root)
      for (const m of meshes) {
        const o = g.children[i++] as Mesh | undefined
        if (!o) continue
        o.matrix.copy(m.matrixWorld)
        o.userData.hidden = !shown
        o.visible = shown
      }
    }
  })

  // 隐藏着的（墙收起来了）不接收点击：射线检测不看 visible，这里自己挡掉
  const hiddenHit = (e: ThreeEvent<PointerEvent | MouseEvent>) => !!(e.object as Object3D).userData.hidden

  return (
    <group ref={group}>
      {targets.flatMap(({ itemId, meshes }) =>
        meshes.map((m) => (
          <mesh
            key={m.uuid}
            geometry={m.geometry}
            material={materialFor ? materialFor(itemId) : material}
            matrixAutoUpdate={false}
            matrix={m.matrixWorld.clone()}
            renderOrder={renderOrder}
            userData={{ overlay: true }}
            onPointerDown={(e) => {
              if (hiddenHit(e)) return
              markInteractiveHit()
              e.stopPropagation()
            }}
            onClick={(e) => {
              if (hiddenHit(e)) return
              e.stopPropagation()
              if (isTap(e)) onTap?.(itemId, e)
            }}
            onPointerOver={(e) => {
              if (hiddenHit(e)) return
              e.stopPropagation()
              onHover?.(itemId)
            }}
            onPointerOut={() => onHover?.(null)}
          />
        )),
      )}
    </group>
  )
}
