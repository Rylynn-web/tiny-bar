import { CanvasTexture, SRGBColorSpace } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { seededRandom } from '../primitives/canvasTexture'

// 墙面装饰的原创抽象图案：全部由种子生成，同样的参数只画一次（按 类型 + 种子 + 配色 + 尺寸 缓存）。
// seed 决定构图，paletteSeed 决定从强调色池里抽哪几种颜色。

const D = sceneConfig.decor
type Palette = Record<string, string>
export type ArtKind = 'bokeh' | 'orb' | 'horizon' | 'plate' | 'frame' | 'sleeve' | 'disc' | 'cover' | 'spread'

const cache = new Map<string, CanvasTexture>()

/** 从强调色池里按 paletteSeed 打乱，取全部（调用方按需取前几个） */
export function pickAccents(paletteSeed: number, palette: Palette) {
  const keys: string[] = [...D.accents]
  const rand = seededRandom(paletteSeed * 7919 + 13)
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[keys[i], keys[j]] = [keys[j], keys[i]]
  }
  return keys.map((k) => palette[k])
}

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const
}
function rgba(hex: string, a: number) {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
/** 两个颜色按 t 混合 */
function mix(a: string, b: string, t: number) {
  const x = rgb(a)
  const y = rgb(b)
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * t))
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
const range = (rand: () => number, [lo, hi]: readonly [number, number]) => lo + rand() * (hi - lo)

type Draw = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rand: () => number,
  accents: string[],
  palette: Palette,
  paletteSeed: number,
) => void

/** 深色底 + 一片模糊的彩色光斑（叠加混合，重叠处更亮） */
const drawBokeh: Draw = (ctx, w, h, rand, accents, palette) => {
  const B = D.bokeh
  const base = palette[B.base]
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, mix(base, '#000000', 0.25))
  bg.addColorStop(1, base)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  const colors = [...accents.slice(0, 3), palette.warmLight]
  const n = Math.round(range(rand, B.spots))
  const short = Math.min(w, h)
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < n; i++) {
    const x = rand() * w
    // 光斑多集中在画面中上部
    const y = h * (0.1 + 0.75 * Math.pow(rand(), 1.3))
    const r = short * range(rand, B.spotRadius)
    const a = range(rand, B.spotAlpha)
    const c = colors[Math.floor(rand() * colors.length)]
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, rgba(c, a))
    g.addColorStop(0.55, rgba(c, a * 0.55))
    g.addColorStop(1, rgba(c, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }
  ctx.globalCompositeOperation = 'source-over'
}

/** 径向渐变底 + 中间一个柔和发光的浅色圆 */
const drawOrb: Draw = (ctx, w, h, rand, accents, palette, paletteSeed) => {
  const O = D.orb
  // 默认配色是青蓝；换配色后从强调色池里取
  const base = paletteSeed === 0 ? palette.accentCyan : accents[0]
  const s = Math.min(w, h)
  // 每个种子：光球的位置、大小、光晕范围，以及底色渐变的中心都不一样
  const cx = w / 2 + (rand() - 0.5) * s * 0.36
  const cy = h / 2 + (rand() - 0.5) * s * 0.36
  const scale = 0.75 + rand() * 0.55
  const gx = w * (0.2 + rand() * 0.6)
  const gy = h * (0.2 + rand() * 0.6)
  const bg = ctx.createRadialGradient(gx, gy, 0, w / 2, h / 2, s * (0.65 + rand() * 0.3))
  bg.addColorStop(0, mix(base, '#FFFFFF', 0.3))
  bg.addColorStop(0.6, base)
  bg.addColorStop(1, mix(base, palette.dark, 0.45))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  const orb = palette[O.orbColor]
  const r = s * O.orbRadius * scale
  const halo = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, s * O.haloRadius * (0.8 + rand() * 0.4) * scale)
  halo.addColorStop(0, rgba(orb, 0.85))
  halo.addColorStop(0.35, rgba(orb, 0.35))
  halo.addColorStop(1, rgba(orb, 0))
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, w, h)
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  core.addColorStop(0, rgba(orb, 1))
  core.addColorStop(0.75, rgba(orb, 0.95))
  core.addColorStop(1, rgba(orb, 0.0))
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
}

/** 浅色天空 + 一个圆形太阳，下面压几条平涂色带（太阳沉在"地平线"后面） */
const drawHorizon: Draw = (ctx, w, h, rand, accents, palette) => {
  const H = D.horizon
  ctx.fillStyle = palette[H.base]
  ctx.fillRect(0, 0, w, h)
  const s = Math.min(w, h)
  const sunR = s * range(rand, H.sunRadius)
  const n = Math.round(range(rand, H.bands))
  // 色带总高度占下半部分
  const horizonY = h * (0.48 + rand() * 0.14)
  ctx.fillStyle = accents[0]
  ctx.beginPath()
  ctx.arc(w * (0.3 + rand() * 0.4), horizonY - sunR * (0.1 + rand() * 0.5), sunR, 0, Math.PI * 2)
  ctx.fill()
  let y = horizonY
  for (let i = 0; i < n; i++) {
    const bandH = i === n - 1 ? h - y : ((h - horizonY) / n) * (0.7 + rand() * 0.6)
    ctx.fillStyle = accents[(i + 1) % accents.length]
    ctx.fillRect(0, y, w, bandH + 1)
    y += bandH
  }
}

/** 同心圆：底色和强调色交替，每圈宽度略有变化 */
const drawPlate: Draw = (ctx, w, h, rand, accents, palette) => {
  const P = D.plate
  const base = palette[P.base]
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  const n = Math.round(range(rand, P.rings))
  const colors = [accents[0], base, accents[1], base, accents[2]]
  let r = w / 2
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = colors[i % colors.length]
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
    ctx.fill()
    r -= (w / 2 / (n + 1)) * (0.7 + rand() * 0.6)
    if (r <= 0) break
  }
}

/** 相框里的抽象色块：浅底 + 2–3 个矩形 / 圆 / 半圆 */
const drawFrame: Draw = (ctx, w, h, rand, accents, palette) => {
  ctx.fillStyle = rand() < 0.5 ? palette.cream : mix(palette.cream, palette.wall, 0.5)
  ctx.fillRect(0, 0, w, h)
  const n = 2 + Math.floor(rand() * 2)
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = accents[i % accents.length]
    const kind = Math.floor(rand() * 3)
    const cx = w * (0.25 + rand() * 0.5)
    const cy = h * (0.25 + rand() * 0.5)
    const size = Math.min(w, h) * (0.2 + rand() * 0.3)
    ctx.beginPath()
    if (kind === 0) ctx.rect(cx - size / 2, cy - size * 0.7, size, size * 1.4)
    else if (kind === 1) ctx.arc(cx, cy, size / 2, 0, Math.PI * 2)
    else ctx.arc(cx, cy, size / 2, Math.PI, 0)
    ctx.fill()
  }
}

/** 唱片封套：一种底色 + 一种抽象构成（大圆 / 条纹 / 点阵 / 半圆叠放），没有文字 */
const drawSleeve: Draw = (ctx, w, h, rand, accents, palette) => {
  // 浅底更常见，深色底少一些（墙上大面积留白）
  const bgPool = [palette.cream, palette.cream, accents[0], palette.dark]
  const bg = bgPool[Math.floor(rand() * bgPool.length)]
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)
  const fg = accents.filter((c) => c !== bg)
  const s = Math.min(w, h)
  const kind = Math.floor(rand() * 4)
  if (kind === 0) {
    // 大圆，偏离中心
    ctx.fillStyle = fg[0]
    ctx.beginPath()
    ctx.arc(w * (0.35 + rand() * 0.3), h * (0.35 + rand() * 0.3), s * (0.22 + rand() * 0.14), 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 1) {
    // 横条纹
    const n = 3 + Math.floor(rand() * 4)
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = fg[i % 2]
      const y = h * (0.15 + (i / n) * 0.7)
      ctx.fillRect(0, y, w, (h * 0.7) / n / 2)
    }
  } else if (kind === 2) {
    // 点阵
    const n = 3 + Math.floor(rand() * 3)
    const step = s / (n + 1)
    ctx.fillStyle = fg[0]
    for (let i = 1; i <= n; i++)
      for (let j = 1; j <= n; j++) {
        ctx.beginPath()
        ctx.arc(i * step, j * step, step * 0.28, 0, Math.PI * 2)
        ctx.fill()
      }
  } else {
    // 两个半圆上下叠放
    const r = s * (0.25 + rand() * 0.1)
    ctx.fillStyle = fg[0]
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, r, Math.PI, 0)
    ctx.fill()
    ctx.fillStyle = fg[1]
    ctx.beginPath()
    ctx.arc(w / 2, h / 2 + r * 0.15, r, 0, Math.PI)
    ctx.fill()
  }
}

/** 黑胶唱片正面：深色底 + 细细的纹路 + 中间彩色贴标和中心孔（画在方块里，圆形以外透明） */
const drawDisc: Draw = (ctx, w, h, rand, accents, palette) => {
  const cx = w / 2
  const cy = h / 2
  const R = Math.min(w, h) / 2
  ctx.fillStyle = palette.dark
  ctx.beginPath()
  ctx.arc(cx, cy, R, 0, Math.PI * 2)
  ctx.fill()
  // 纹路：几十圈很淡的细环
  ctx.lineWidth = Math.max(1, R / 140)
  for (let r = R * 0.38; r < R * 0.97; r += R / (34 + rand() * 10)) {
    ctx.strokeStyle = `rgba(255,255,255,${0.035 + rand() * 0.05})`
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  // 贴标：一种强调色，有时再叠一个半圆
  const lr = R * 0.34
  ctx.fillStyle = accents[0]
  ctx.beginPath()
  ctx.arc(cx, cy, lr, 0, Math.PI * 2)
  ctx.fill()
  if (rand() < 0.6) {
    ctx.fillStyle = accents[1]
    ctx.beginPath()
    ctx.arc(cx, cy, lr, rand() * Math.PI, rand() * Math.PI + Math.PI)
    ctx.fill()
  }
  ctx.fillStyle = palette.dark
  ctx.beginPath()
  ctx.arc(cx, cy, R * 0.035, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * 书 / 杂志封面的颜色组（米色系 / 黑白 / 深蓝），由 group 指定（书架按顺序轮换，保证三组都出现）。
 * 每组前两个颜色互为底色和主图形色，第三个是小面积的点缀。返回 [底色, 图形色, 点缀色]
 */
function coverColors(rand: () => number, palette: Palette, group: number) {
  const groups = sceneConfig.decor.bookLedge.coverGroups
  const g = groups[((group % groups.length) + groups.length) % groups.length].map((k) => palette[k])
  const flip = rand() < 0.5
  const bg = flip ? g[1] : g[0]
  const fg = flip ? g[0] : g[1]
  return [bg, fg, g[2] ?? fg]
}

/** 一块封面构成（没有文字）：大色块 / 圆 / 拱形 / 植物剪影 / 渐变"照片" */
function drawCoverArt(
  ctx: CanvasRenderingContext2D,
  x0: number,
  w: number,
  h: number,
  rand: () => number,
  palette: Palette,
  group: number,
) {
  const [bg, fg, fg2] = coverColors(rand, palette, group)
  ctx.fillStyle = bg
  ctx.fillRect(x0, 0, w, h)
  const s = Math.min(w, h)
  const kind = Math.floor(rand() * 5)
  ctx.fillStyle = fg
  if (kind === 0) {
    // 下半部分一块"照片"色块 + 顶部细条（像标题栏，但不写字）
    ctx.fillRect(x0 + w * 0.12, h * 0.42, w * 0.76, h * 0.46)
    ctx.fillStyle = fg2
    ctx.fillRect(x0 + w * 0.12, h * 0.12, w * (0.3 + rand() * 0.4), h * 0.05)
  } else if (kind === 1) {
    ctx.beginPath()
    ctx.arc(x0 + w * (0.35 + rand() * 0.3), h * (0.4 + rand() * 0.25), s * (0.2 + rand() * 0.12), 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 2) {
    // 拱形
    const aw = w * 0.5
    const ax = x0 + (w - aw) / 2
    ctx.beginPath()
    ctx.moveTo(ax, h * 0.85)
    ctx.lineTo(ax, h * 0.5)
    ctx.arc(ax + aw / 2, h * 0.5, aw / 2, Math.PI, 0)
    ctx.lineTo(ax + aw, h * 0.85)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 3) {
    // 植物剪影：一根茎 + 几片椭圆叶子
    const cx = x0 + w / 2
    ctx.strokeStyle = fg
    ctx.lineWidth = Math.max(1, s * 0.02)
    ctx.beginPath()
    ctx.moveTo(cx, h * 0.88)
    ctx.lineTo(cx, h * 0.3)
    ctx.stroke()
    const n = 4 + Math.floor(rand() * 3)
    for (let i = 0; i < n; i++) {
      const y = h * (0.3 + (i / n) * 0.5)
      const side = i % 2 ? 1 : -1
      ctx.save()
      ctx.translate(cx + side * s * 0.12, y)
      ctx.rotate(side * (0.5 + rand() * 0.3))
      ctx.beginPath()
      ctx.ellipse(0, 0, s * 0.14, s * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }
  } else {
    // 渐变"照片"：中间一块从图形色到底色的柔和过渡
    const g = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.9)
    g.addColorStop(0, fg)
    g.addColorStop(1, fg2)
    ctx.fillStyle = g
    ctx.fillRect(x0 + w * 0.1, h * 0.2, w * 0.8, h * 0.6)
  }
}

/** 竖版封面 */
const drawCover: Draw = (ctx, w, h, rand, _accents, palette, group) => drawCoverArt(ctx, 0, w, h, rand, palette, group)

/** 摊开的杂志：左右两页各一块构成，中间一道折痕 */
const drawSpread: Draw = (ctx, w, h, rand, _accents, palette, group) => {
  drawCoverArt(ctx, 0, w / 2, h, rand, palette, group)
  ctx.fillStyle = palette.cream
  ctx.fillRect(w / 2, 0, w / 2, h)
  // 右页：浅底上几条灰线（像正文，但只是色条）
  ctx.fillStyle = rgba(palette.dark, 0.25)
  for (let i = 0; i < 6; i++) ctx.fillRect(w * 0.58, h * (0.2 + i * 0.1), w * (0.25 + rand() * 0.12), h * 0.02)
  ctx.fillStyle = rgba(palette.dark, 0.18)
  ctx.fillRect(w / 2 - 1, 0, 2, h)
}

const drawers: Record<ArtKind, Draw> = {
  bokeh: drawBokeh,
  orb: drawOrb,
  horizon: drawHorizon,
  plate: drawPlate,
  frame: drawFrame,
  sleeve: drawSleeve,
  disc: drawDisc,
  cover: drawCover,
  spread: drawSpread,
}

/**
 * 取一张画作贴图。aspect = 宽 / 高；longSide = 长边像素。
 * 参数相同直接复用缓存，只在第一次时生成。
 */
export function getArtTexture(
  kind: ArtKind,
  seed: number,
  paletteSeed: number,
  palette: Palette,
  aspect: number,
  longSide: number,
) {
  const accents = pickAccents(paletteSeed, palette)
  const w = Math.round(aspect >= 1 ? longSide : longSide * aspect)
  const h = Math.round(aspect >= 1 ? longSide / aspect : longSide)
  const key = [kind, seed, paletteSeed, w, h, accents.join(''), palette.cream, palette.dark, palette.wall, palette.warmLight].join('|')
  let tex = cache.get(key)
  if (!tex) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    drawers[kind](ctx, w, h, seededRandom(seed * 2654435761 + 1), accents, palette, paletteSeed)
    tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    cache.set(key, tex)
  }
  return tex
}

export type AtlasCell = { kind: ArtKind; seed: number; paletteSeed: number; aspect: number }

/**
 * 几幅小图拼成一张贴图（横向排开），返回贴图和每幅在贴图里的 UV 范围 [u0, u1]。
 * 用同一张贴图的几块平面材质相同，会被合并成一次绘制（层板组的相框用）。
 */
export function getAtlasTexture(cells: AtlasCell[], palette: Palette, cellHeight: number) {
  const widths = cells.map((c) => Math.round(cellHeight * c.aspect))
  const total = widths.reduce((a, b) => a + b, 0)
  const accentsKey = cells.map((c) => pickAccents(c.paletteSeed, palette).join('')).join('/')
  const key = [
    'atlas',
    cellHeight,
    cells.map((c) => `${c.kind}:${c.seed}:${c.paletteSeed}:${c.aspect}`).join(','),
    accentsKey,
    palette.cream,
    palette.wall,
    palette.dark,
    palette.navy,
    palette.wood,
  ].join('|')
  const ranges: [number, number][] = []
  let x = 0
  for (const w of widths) {
    ranges.push([x / total, (x + w) / total])
    x += w
  }
  let tex = cache.get(key)
  if (!tex) {
    const canvas = document.createElement('canvas')
    canvas.width = total
    canvas.height = cellHeight
    const ctx = canvas.getContext('2d')!
    let ox = 0
    cells.forEach((c, i) => {
      ctx.save()
      ctx.translate(ox, 0)
      ctx.beginPath()
      ctx.rect(0, 0, widths[i], cellHeight)
      ctx.clip()
      drawers[c.kind](ctx, widths[i], cellHeight, seededRandom(c.seed * 2654435761 + 1), pickAccents(c.paletteSeed, palette), palette, c.paletteSeed)
      ctx.restore()
      ox += widths[i]
    })
    tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    cache.set(key, tex)
  }
  return { texture: tex, ranges }
}

/**
 * 门口地毯图案：0 格子（参考图的方格毯）/ 1 波浪线（几道弯曲的平行线）/ 2 条纹。
 * base = 底色，line = 线条色，accent = 一小段点缀色。宽高比 aspect = 宽 / 深
 */
export function getMatTexture(pattern: number, seed: number, base: string, line: string, accent: string, aspect: number, longSide: number) {
  const w = Math.round(aspect >= 1 ? longSide : longSide * aspect)
  const h = Math.round(aspect >= 1 ? longSide / aspect : longSide)
  const key = ['mat', pattern, seed, base, line, accent, w, h].join('|')
  let tex = cache.get(key)
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const rand = seededRandom(seed * 7349 + 11)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  const s = Math.min(w, h)
  if (pattern === 0) {
    // 格子：奶白粗线，边缘一圈宽边；一个格子填点缀色
    const n = 5 + Math.floor(rand() * 4)
    const cw = w / n
    const ch = h / Math.max(3, Math.round(n / aspect))
    ctx.strokeStyle = line
    ctx.lineWidth = s * 0.022
    for (let x = 0; x <= w + 1; x += cw) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y <= h + 1; y += ch) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }
    ctx.fillStyle = accent
    const cx = Math.floor(rand() * n)
    const cy = Math.floor(rand() * (h / ch))
    ctx.fillRect(cx * cw + ctx.lineWidth, cy * ch + ctx.lineWidth, cw - ctx.lineWidth * 2, ch - ctx.lineWidth * 2)
  } else if (pattern === 1) {
    // 波浪线：一组平行的弯曲线条，其中一道用点缀色
    const n = 4 + Math.floor(rand() * 3)
    const amp = h * (0.12 + rand() * 0.1)
    const freq = 1 + rand() * 1.5
    const phase = rand() * Math.PI * 2
    ctx.lineWidth = s * 0.03
    ctx.lineCap = 'round'
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = i === Math.floor(n / 2) ? accent : line
      const y0 = h * (0.2 + (i / (n - 1)) * 0.6)
      ctx.beginPath()
      for (let x = 0; x <= w; x += w / 60) {
        const y = y0 + Math.sin((x / w) * Math.PI * 2 * freq + phase) * amp
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  } else {
    // 条纹：沿长边的宽窄条，一条点缀色
    let x = w * 0.08
    let i = 0
    while (x < w * 0.92) {
      const sw = w * (0.03 + rand() * 0.06)
      ctx.fillStyle = i === 2 ? accent : line
      ctx.fillRect(x, h * 0.1, sw, h * 0.8)
      x += sw + w * (0.04 + rand() * 0.08)
      i++
    }
  }
  // 外圈一道窄边
  ctx.strokeStyle = line
  ctx.lineWidth = s * 0.03
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth)
  tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}
