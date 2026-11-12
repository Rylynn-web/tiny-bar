import { CanvasTexture, SRGBColorSpace } from 'three'
import { buddyShape as S, sceneConfig } from '../../config/sceneConfig'
import { faceAtlas as A, type Expression } from '../../config/expressions'

// 表情图集：每种眼睛形状（和腮红）画在一格里。格子的横向 = 脸上的左右角度，纵向 = 上下角度，
// 和贴片几何体（parts.ts 的 faceGeometry）一一对应，所以画在格子里的位置就是脸上的位置。

const F = sceneConfig.buddy.face
const CW = A.width / A.cols
const CH = A.height / A.rows

/** 脸上的角度（度）→ 格子里的像素：u 从观看者的左到右，v 从上到下 */
function toCell(yawDeg: number, pitchDeg: number) {
  const u = (F.yawRange - yawDeg) / (2 * F.yawRange)
  const v = (pitchDeg - F.pitchRange[0]) / (F.pitchRange[1] - F.pitchRange[0])
  return { x: u * CW, y: (1 - v) * CH }
}

const deg = (r: number) => (r * 180) / Math.PI
const eyeYaw = deg(S.eye.yaw)
const eyePitch = deg(S.eye.pitch)

/** 两只眼睛的中心（格子里的像素），左边那只先 */
function eyeCenters() {
  return [toCell(eyeYaw, eyePitch), toCell(-eyeYaw, eyePitch)]
}

function drawEyes(ctx: CanvasRenderingContext2D, ox: number, oy: number, kind: Expression, color: string) {
  ctx.save()
  ctx.translate(ox, oy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = A.stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  eyeCenters().forEach(({ x, y }, i) => {
    ctx.beginPath()
    if (kind === 'default') {
      ctx.ellipse(x, y, A.dot.rx, A.dot.ry, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (kind === 'happy') {
      // ^：向上的弧线
      const { halfWidth: w, rise: h } = A.arc
      ctx.moveTo(x - w, y + h * 0.6)
      ctx.quadraticCurveTo(x, y - h * 1.6, x + w, y + h * 0.6)
      ctx.stroke()
    } else if (kind === 'squint') {
      // 左眼 >、右眼 <
      const w = A.arc.halfWidth * 0.85
      const s = i === 0 ? 1 : -1
      ctx.moveTo(x - s * w, y - w)
      ctx.lineTo(x + s * w * 0.7, y)
      ctx.lineTo(x - s * w, y + w)
      ctx.stroke()
    } else if (kind === 'surprised') {
      ctx.arc(x, y, A.ring, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(x, y, A.ringDot, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // focus：一道短横线
      ctx.moveTo(x - A.arc.halfWidth, y + 2)
      ctx.lineTo(x + A.arc.halfWidth, y + 2)
      ctx.stroke()
    }
  })
  ctx.restore()
}

function drawBlush(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const b = A.blush
  ctx.save()
  ctx.translate(ox, oy)
  ctx.globalAlpha = b.alpha
  ctx.fillStyle = b.color
  for (const side of [1, -1]) {
    const { x, y } = toCell(side * F.blush.yawDeg, F.blush.pitchDeg)
    ctx.beginPath()
    ctx.ellipse(x, y, b.rx, b.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

const cellOrigin = (index: number) => ({ x: (index % A.cols) * CW, y: Math.floor(index / A.cols) * CH })

const cache = new Map<string, CanvasTexture>()

/** 表情图集（按眼睛颜色缓存，只画一次） */
export function getFaceAtlas(eyeColor: string) {
  let tex = cache.get(eyeColor)
  if (tex) return tex
  const canvas = document.createElement('canvas')
  canvas.width = A.width
  canvas.height = A.height
  const ctx = canvas.getContext('2d')!
  for (const kind of ['default', 'happy', 'squint', 'surprised', 'focus'] as Expression[]) {
    const o = cellOrigin(A.cells[kind])
    drawEyes(ctx, o.x, o.y, kind, eyeColor)
  }
  const b = cellOrigin(A.cells.blush)
  drawBlush(ctx, b.x, b.y)
  tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  cache.set(eyeColor, tex)
  return tex
}

/** 第 index 格在贴图坐标里的左下角（每个实例的偏移；格子大小 = 1 / cols, 1 / rows） */
export function cellOffset(index: number): [number, number] {
  const col = index % A.cols
  const row = Math.floor(index / A.cols)
  return [col / A.cols, 1 - (row + 1) / A.rows]
}
