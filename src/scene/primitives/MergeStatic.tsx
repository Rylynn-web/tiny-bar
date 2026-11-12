import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { RemergeContext } from './remerge'
import { BufferAttribute, Color, DoubleSide, Matrix4, Mesh, MeshStandardMaterial, type BufferGeometry, type Group } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 把一个物件里"除了颜色以外材质都一样"的零件合并成一个网格，减少绘制调用（手机性能）。
// 颜色不同的零件也能合：每个零件的颜色写进顶点颜色，合并后用一份白色、开启顶点颜色的材质。
// 原零件只是隐藏：不上传显卡、不参与阴影；参数变化时撤销合并、重新合并。

const KEEP = new Set(['position', 'normal', 'uv'])
const white = new Color(1, 1, 1)

/**
 * 能合并的零件返回分组键；实例化、半透明、多材质、已有顶点颜色、标了 noMerge 的返回 null。
 * 不含颜色（颜色进顶点颜色）；只有自发光的零件按颜色分开——自发光色跟着材质色，不能写进顶点
 */
function signature(mesh: Mesh): string | null {
  if ((mesh as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh) return null
  if (mesh.userData.noMerge || mesh.userData.merged) return null
  const m = mesh.material
  if (Array.isArray(m) || !(m instanceof MeshStandardMaterial) || m.transparent || m.vertexColors) return null
  const glowing = m.emissiveIntensity > 0 && m.emissive.getHex() !== 0
  return [
    m.type,
    glowing ? m.color.getHexString() : '',
    m.colorWrite,
    m.depthWrite,
    m.roughness,
    m.metalness,
    m.emissive.getHexString(),
    m.emissiveIntensity,
    m.envMapIntensity,
    // 单面 / 双面、是否接收阴影不分组：合并后取"最宽"的设置（有一块双面就双面，有一块接收就接收）
    m.map?.uuid ?? '',
    mesh.castShadow,
    mesh.renderOrder,
  ].join('|')
}

/** 统一成非索引、只保留位置/法线/UV，变换到物件坐标系，并把零件颜色写进顶点颜色 */
function prepare(source: BufferGeometry, matrix: Matrix4, color: Color) {
  const g = source.index ? source.toNonIndexed() : source.clone()
  for (const name of Object.keys(g.attributes)) if (!KEEP.has(name)) g.deleteAttribute(name)
  g.morphAttributes = {}
  if (!g.attributes.normal) g.computeVertexNormals()
  if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
  g.clearGroups()
  g.applyMatrix4(matrix)
  const n = g.attributes.position.count
  const colors = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) color.toArray(colors, i * 3)
  g.setAttribute('color', new BufferAttribute(colors, 3))
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
  const [nonce, setNonce] = useState(0)
  const requestRemerge = useCallback(() => setNonce((n) => n + 1), [])

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
      const parts = meshes.map((m) =>
        prepare(
          m.geometry,
          new Matrix4().multiplyMatrices(toLocal, m.matrixWorld),
          (m.material as MeshStandardMaterial).color,
        ),
      )
      const merged = mergeGeometries(parts, false)
      parts.forEach((p) => p.dispose())
      if (!merged) continue
      const first = meshes[0]
      // 合并后的材质：复制第一块的参数，底色改成白色、读顶点颜色（自发光零件的颜色本来就相同）
      const material = (first.material as MeshStandardMaterial).clone()
      material.color.copy(white)
      material.vertexColors = true
      const mats = meshes.map((x) => x.material as MeshStandardMaterial)
      if (mats.some((x) => x.side === DoubleSide)) material.side = DoubleSide
      if (mats.some((x) => x.shadowSide === DoubleSide)) material.shadowSide = DoubleSide
      const mesh = new Mesh(merged, material)
      mesh.castShadow = first.castShadow
      mesh.receiveShadow = meshes.some((x) => x.receiveShadow)
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
        ;(m.material as MeshStandardMaterial).dispose()
      }
      for (const m of hidden) m.visible = true
    }
  }, [enabled, version, extra, nonce])

  return (
    <RemergeContext.Provider value={requestRemerge}>
      <group ref={ref}>{children}</group>
    </RemergeContext.Provider>
  )
}
