import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { BufferAttribute, Matrix4, Mesh, MeshStandardMaterial, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 把一个物件里"材质看起来完全一样"的零件合并成一个网格，减少绘制调用（手机性能）。
// 原零件只是隐藏：不上传显卡、不参与阴影；参数变化时撤销合并、重新合并。

const KEEP = new Set(['position', 'normal', 'uv'])

/** 能合并的零件返回分组键；实例化、半透明、多材质、标了 noMerge 的返回 null */
function signature(mesh: Mesh): string | null {
  if ((mesh as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh) return null
  if (mesh.userData.noMerge || mesh.userData.merged) return null
  const m = mesh.material
  if (Array.isArray(m) || !(m instanceof MeshStandardMaterial) || m.transparent) return null
  return [
    m.type,
    m.color.getHexString(),
    m.roughness,
    m.metalness,
    m.emissive.getHexString(),
    m.emissiveIntensity,
    m.envMapIntensity,
    m.side,
    m.shadowSide,
    m.map?.uuid ?? '',
    mesh.castShadow,
    mesh.receiveShadow,
    mesh.renderOrder,
  ].join('|')
}

/** 统一成非索引、只保留位置/法线/UV，并变换到物件坐标系 */
function prepare(source: BufferGeometry, matrix: Matrix4) {
  const g = source.index ? source.toNonIndexed() : source.clone()
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name)
  g.morphAttributes = {}
  if (!g.attributes.normal) g.computeVertexNormals()
  if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  g.clearGroups()
  g.applyMatrix4(matrix)
  return g
}

type Props = {
  children: ReactNode
  enabled: boolean
  /** 任何会改变零件外观或几何的输入（参数、props）；变了就重新合并 */
  version: unknown
  extra?: string
}

export function MergeStatic({ children, enabled, version, extra }: Props) {
  const ref = useRef<Group>(null)

  useLayoutEffect(() => {
    const root = ref.current
    if (!root || !enabled) return

    root.updateWorldMatrix(true, true)
    const toLocal = new Matrix4().copy(root.matrixWorld).invert()
    const groups = new Map<string, Mesh[]>()
    root.traverse((o) => {
      const mesh = o as Mesh
      if (!mesh.isMesh || !mesh.visible) return
      const key = signature(mesh)
      if (!key) return
      const list = groups.get(key)
      if (list) list.push(mesh)
      else groups.set(key, [mesh])
    })

    const created: Mesh[] = []
    const hidden: Mesh[] = []
    for (const meshes of groups.values()) {
      if (meshes.length < 2) continue
      const parts = meshes.map((m) => prepare(m.geometry, new Matrix4().multiplyMatrices(toLocal, m.matrixWorld)))
      const merged = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      if (!merged) continue
      const first = meshes[0]
      const mesh = new Mesh(merged, first.material)
      mesh.castShadow = first.castShadow
      mesh.receiveShadow = first.receiveShadow
      mesh.renderOrder = first.renderOrder
      mesh.userData.merged = true
      root.add(mesh)
      created.push(mesh)
      for (const m of meshes) {
        m.visible = false
        hidden.push(m)
      }
    }

    return () => {
      for (const m of created) {
        root.remove(m)
        m.geometry.dispose()
      }
      for (const m of hidden) m.visible = true
    }
  }, [enabled, version, extra])

  return <group ref={ref}>{children}</group>
}
