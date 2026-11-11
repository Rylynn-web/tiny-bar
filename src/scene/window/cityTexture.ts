import { CanvasTexture, LinearFilter, NoColorSpace, RepeatWrapping, ClampToEdgeWrapping } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { seededRandom } from '../primitives/canvasTexture'

// 城市剪影贴图（程序化，固定种子，每次加载都一样）。这是"数据贴图"，不是颜色：
//   R = 楼体轮廓（1 = 楼，0 = 天空）
//   G = 每栋楼的随机值（用来做明暗起伏）
//   B = 这里能不能有窗户（楼身 1，尖顶 0）
// 横向首尾相接可以无缝平铺；纵向往下是实心楼体（着色器里超出底部按楼体处理）。

type LayerCfg = (typeof sceneConfig.cityView.layers)[number]

export type CityTexture = {
  texture: CanvasTexture
  /** 最高那栋楼的楼顶在贴图里的位置（u 0–1，v 0–1，v 从下往上），信号灯放在这里 */
  tallest: { u: number; v: number }
}

const cache = new Map<string, CityTexture>()

export function getCityTexture(index: number, layer: LayerCfg): CityTexture {
  const key = `${index}|${sceneConfig.cityView.seed}|${JSON.stringify(layer)}`
  const hit = cache.get(key)
  if (hit) return hit

  const n = Math.min(sceneConfig.cityView.textureSize, 512)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = n
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(0,0,0)'
  ctx.fillRect(0, 0, n, n)
  const rand = seededRandom(sceneConfig.cityView.seed + index * 7919)

  let tallest = { u: 0.5, v: 0 }
  // 横向画满一圈，最后一栋跨过右边界时在左边再画一次，保证无缝
  let x = 0
  while (x < n) {
    const w = layer.buildingWidth[0] + rand() * (layer.buildingWidth[1] - layer.buildingWidth[0])
    const hFrac = layer.buildingHeight[0] + rand() * (layer.buildingHeight[1] - layer.buildingHeight[0])
    const h = hFrac * n
    const g = Math.floor(rand() * 255)
    const round = rand() < layer.roundChance
    const spire = rand() < layer.spireChance
    const radius = round ? Math.min(w / 2, w * (0.2 + rand() * 0.3)) : Math.min(3, w / 4)
    const spireH = spire ? h * (0.12 + rand() * 0.15) : 0
    const draw = (ox: number) => {
      const left = ox
      const top = n - h
      ctx.fillStyle = `rgb(255,${g},255)`
      ctx.beginPath()
      ctx.roundRect(left, top, w, h + 1, [radius, radius, 0, 0])
      ctx.fill()
      if (spire) {
        // 尖顶：细长三角，不开窗（B = 0）
        ctx.fillStyle = `rgb(255,${g},0)`
        const cx = left + w / 2
        const sw = Math.max(2, w * 0.12)
        ctx.beginPath()
        ctx.moveTo(cx - sw / 2, top + radius * 0.5)
        ctx.lineTo(cx + sw / 2, top + radius * 0.5)
        ctx.lineTo(cx, top - spireH)
        ctx.closePath()
        ctx.fill()
      }
    }
    draw(x)
    if (x + w > n) draw(x - n)
    const topV = (h + spireH) / n
    if (topV > tallest.v) tallest = { u: ((x + w / 2) % n) / n, v: topV }
    // 楼和楼之间偶尔留一点缝
    x += w + (rand() < 0.3 ? rand() * 6 : 0)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = NoColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = ClampToEdgeWrapping
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false
  texture.flipY = true
  const result = { texture, tallest }
  cache.set(key, result)
  return result
}
