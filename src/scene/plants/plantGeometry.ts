import { Box3, BufferAttribute, BufferGeometry, Color, Mesh, MeshStandardMaterial, Vector3, type Object3D } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

// 外部植物模型的处理：按三角面原本的颜色（贴图图集上取色，或材质颜色）分成
// 浅色叶子 / 深色叶子 / 茎干三块，换算到"根部在原点、高度为目标高度"的坐标里。
// 之后各块套上调色板里的哑光颜色，模型自带的材质和贴图都不再使用。

export type PotStyle = keyof typeof sceneConfig.plants.pots

/** 植物根部应该落在的高度（盆底为 0） */
export function soilHeight(style: PotStyle) {
  const P = sceneConfig.plants
  return P.pots[style].height - P.soilDrop - P.plantSink
}

export type PlantParts = { leaf: BufferGeometry; leafDark: BufferGeometry; stem: BufferGeometry }
type Klass = keyof PlantParts

const C = sceneConfig.plants.classify
const hsl = { h: 0, s: 0, l: 0 }

function classify(color: Color): Klass {
  color.getHSL(hsl)
  const hue = hsl.h * 360
  const isLeaf = hue >= C.hueMin && hue <= C.hueMax && hsl.s >= C.minSaturation
  if (!isLeaf) return 'stem'
  return hsl.l < C.darkLightness ? 'leafDark' : 'leaf'
}

/** 把贴图画到 canvas 上读像素，用来按 UV 取色 */
function readPixels(image: CanvasImageSource & { width: number; height: number }) {
  const canvas = document.createElement('canvas')
  canvas.width = image.width
  canvas.height = image.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(image, 0, 0)
  const data = ctx.getImageData(0, 0, image.width, image.height).data
  return { data, w: image.width, h: image.height }
}

const cache = new Map<string, PlantParts>()

export function getPlantParts(key: string, root: Object3D, height: number, baseAnchor: number): PlantParts {
  const hit = cache.get(key)
  if (hit) return hit

  root.updateMatrixWorld(true)
  const buckets: Record<Klass, { pos: number[]; nor: number[] }> = {
    leaf: { pos: [], nor: [] },
    leafDark: { pos: [], nor: [] },
    stem: { pos: [], nor: [] },
  }
  const color = new Color()

  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as MeshStandardMaterial
    let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone()
    g.applyMatrix4(mesh.matrixWorld)
    if (!g.attributes.normal) g.computeVertexNormals()
    const pos = g.attributes.position
    const nor = g.attributes.normal
    const uv = g.attributes.uv
    const img = mat.map?.image as (CanvasImageSource & { width: number; height: number }) | undefined
    const px = img && uv ? readPixels(img) : null
    const flipY = mat.map?.flipY ?? false

    for (let t = 0; t < pos.count; t += 3) {
      if (px) {
        // 三角面三个顶点 UV 的平均处取色
        const u = (uv.getX(t) + uv.getX(t + 1) + uv.getX(t + 2)) / 3
        const v = (uv.getY(t) + uv.getY(t + 1) + uv.getY(t + 2)) / 3
        const x = Math.min(px.w - 1, Math.max(0, Math.floor((((u % 1) + 1) % 1) * px.w)))
        const vv = (((v % 1) + 1) % 1)
        const y = Math.min(px.h - 1, Math.max(0, Math.floor((flipY ? 1 - vv : vv) * px.h)))
        const i = (y * px.w + x) * 4
        color.setRGB(px.data[i] / 255, px.data[i + 1] / 255, px.data[i + 2] / 255)
      } else {
        color.copy(mat.color)
      }
      const b = buckets[classify(color)]
      for (let k = 0; k < 3; k++) {
        b.pos.push(pos.getX(t + k), pos.getY(t + k), pos.getZ(t + k))
        b.nor.push(nor.getX(t + k), nor.getY(t + k), nor.getZ(t + k))
      }
    }
    g.dispose()
    mat.map?.dispose()
  })

  // 包围盒 → 缩放到目标高度，水平居中，根部（baseAnchor 处）对齐 y=0
  const all = new BufferGeometry()
  all.setAttribute('position', new BufferAttribute(new Float32Array([...buckets.leaf.pos, ...buckets.leafDark.pos, ...buckets.stem.pos]), 3))
  const box = new Box3().setFromBufferAttribute(all.attributes.position as BufferAttribute)
  all.dispose()
  const size = box.getSize(new Vector3())
  const s = size.y > 0 ? height / size.y : 1
  const cx = (box.min.x + box.max.x) / 2
  const cz = (box.min.z + box.max.z) / 2
  const baseY = box.min.y + size.y * baseAnchor

  const make = (b: { pos: number[]; nor: number[] }) => {
    const g = new BufferGeometry()
    const p = new Float32Array(b.pos)
    for (let i = 0; i < p.length; i += 3) {
      p[i] = (p[i] - cx) * s
      p[i + 1] = (p[i + 1] - baseY) * s
      p[i + 2] = (p[i + 2] - cz) * s
    }
    g.setAttribute('position', new BufferAttribute(p, 3))
    g.setAttribute('normal', new BufferAttribute(new Float32Array(b.nor), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array((p.length / 3) * 2), 2))
    g.computeBoundingSphere()
    return g
  }

  const parts: PlantParts = { leaf: make(buckets.leaf), leafDark: make(buckets.leafDark), stem: make(buckets.stem) }
  cache.set(key, parts)
  return parts
}
