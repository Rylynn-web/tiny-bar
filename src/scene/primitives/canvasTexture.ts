import { CanvasTexture, SRGBColorSpace } from 'three'

// Canvas 贴图：按 key 只生成一次并缓存，边长不超过 512（scene-style 规则）

const MAX_SIZE = 512
const cache = new Map<string, CanvasTexture>()

/**
 * 取一张 Canvas 贴图。key 相同直接复用；draw 在第一次时调用。
 * key 里要包含会影响画面的参数（如颜色），参数变了才会重画。
 */
export function getCanvasTexture(
  key: string,
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
) {
  let tex = cache.get(key)
  if (!tex) {
    const n = Math.min(size, MAX_SIZE)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = n
    draw(canvas.getContext('2d')!, n)
    tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    cache.set(key, tex)
  }
  return tex
}

/** 可复现的伪随机数（同一个种子每次结果相同），用来摆书、浆果等 */
export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}
