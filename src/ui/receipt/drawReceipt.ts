import { sceneConfig } from '../../config/sceneConfig'
import { isMenuId } from '../../config/menu'
import type { SessionLog } from '../../state/sessionLog'
import { copy, fill } from '../copy'

// 小票：用 2D canvas 按会话记录画一张热敏纸小票（不截 3D 画面）。日期、时间按访客选的时区显示。

const R = sceneConfig.ui.receipt
const C = copy.receipt

/** 某个时区里的日期，比如 "Thu, 12 Nov 2026" */
function dateIn(tz: string, at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(at)
}

/** 某个时区里的时刻，比如 "21:05" */
function timeIn(tz: string, at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(at)
}

/** 停留时长："1h 12m"、"25 min"、"< 1 min" */
export function formatStay(ms: number) {
  const min = Math.floor(ms / 60000)
  if (min < 1) return '< 1 min'
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

/** 文件名里的日期，比如 2026-11-12 */
export function fileDate(tz: string, at: number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)
}

/** 小票上的一行（先排版算出总高度，再一次画出来） */
type Op =
  | { kind: 'text'; text: string; align: 'left' | 'center' | 'right'; size: number; bold?: boolean; faint?: boolean; spacing?: number }
  | { kind: 'pair'; left: string; right: string; size: number; bold?: boolean }
  | { kind: 'rule' }
  | { kind: 'gap'; h: number }

/** 把一段文字按宽度折行 */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

export function drawReceipt(log: SessionLog, tz: string, labels: { menu: Record<string, string> }): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const W = R.width
  const inner = W - R.padding * 2
  const font = (size: number, bold?: boolean) => `${bold ? '700 ' : ''}${size}px ${R.font}`

  const entered = log.enteredAt ?? Date.now()
  const left = log.leftAt ?? Date.now()

  // ── 排版 ──
  const ops: Op[] = []
  const text = (t: string, align: 'left' | 'center' | 'right' = 'left', size: number = R.bodySize, extra: Partial<Extract<Op, { kind: 'text' }>> = {}) => {
    ctx.font = font(size, extra.bold)
    for (const line of wrap(ctx, t, inner)) ops.push({ kind: 'text', text: line, align, size, ...extra })
  }
  const pair = (l: string, r: string, bold = false) => ops.push({ kind: 'pair', left: l, right: r, size: R.bodySize, bold })
  const rule = () => ops.push({ kind: 'rule' })
  const gap = (h = 6) => ops.push({ kind: 'gap', h })
  const heading = (t: string) => {
    text(t.toUpperCase(), 'left', R.smallSize, { bold: true, spacing: 1.5 })
    gap(2)
  }

  gap(4)
  text(C.shopName, 'center', R.titleSize, { bold: true, spacing: 3 })
  text(C.tagline, 'center', R.smallSize, { faint: true })
  gap(4)
  rule()
  pair(C.date, dateIn(tz, entered))
  pair(C.arrived, timeIn(tz, entered))
  pair(C.left, timeIn(tz, left))
  pair(C.stayed, formatStay(left - entered), true)
  rule()
  pair(C.guest, log.title ?? '—', true)
  rule()

  heading(C.orders)
  if (log.orders.length) for (const o of log.orders) pair(isMenuId(o.item) ? labels.menu[o.item] : o.item, timeIn(tz, o.at))
  else text(C.none)
  gap()
  heading(C.songs)
  if (log.songs.length)
    for (const s of log.songs) {
      pair(s.title, timeIn(tz, s.at))
      text(`  ${s.artist}`, 'left', R.smallSize, { faint: true })
    }
  else text(C.none)

  if (log.goodChats.length) {
    rule()
    // 称号里的空格换成不断行空格：折行时称号不会被拆到两行
    for (const c of log.goodChats) text(fill(C.chat, { title: c.title.replace(/ /g, '\u00a0') }), 'center')
  }
  rule()
  gap(2)
  text(C.thanks, 'center')
  text(C.comeBack, 'center')
  gap(8)
  text('* * *', 'center', R.smallSize, { faint: true })
  gap(R.tear.height + 6)

  // ── 算高度 ──
  const lineH = (size: number) => size * R.lineHeight
  const ruleH = R.bodySize
  let height: number = R.padding
  for (const op of ops) height += op.kind === 'text' || op.kind === 'pair' ? lineH(op.size) : op.kind === 'rule' ? ruleH : op.h
  height = Math.ceil(height)

  // ── 画 ──
  const s = R.scale
  canvas.width = W * s
  canvas.height = height * s
  ctx.scale(s, s)

  // 纸：底部是锯齿撕边（锯齿外面透明）
  const t = R.tear
  ctx.fillStyle = R.paper
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W, height - t.height)
  const teeth = Math.ceil(W / t.width)
  for (let i = teeth; i >= 0; i--) {
    const x = (i * W) / teeth
    ctx.lineTo(x, i % 2 === 0 ? height - t.height : height)
  }
  ctx.closePath()
  ctx.fill()
  // 热敏纸的细微纹理：几条很淡的横线
  ctx.fillStyle = 'rgba(0, 0, 0, 0.018)'
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, W, 1)

  let y: number = R.padding
  ctx.textBaseline = 'middle'
  for (const op of ops) {
    if (op.kind === 'gap') {
      y += op.h
      continue
    }
    if (op.kind === 'rule') {
      ctx.strokeStyle = R.faint
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      ctx.beginPath()
      ctx.moveTo(R.padding, y + ruleH / 2)
      ctx.lineTo(W - R.padding, y + ruleH / 2)
      ctx.stroke()
      ctx.setLineDash([])
      y += ruleH
      continue
    }
    const h = lineH(op.size)
    const cy = y + h / 2
    if (op.kind === 'pair') {
      ctx.font = font(op.size, op.bold)
      ctx.fillStyle = R.ink
      ctx.textAlign = 'left'
      ctx.fillText(op.left, R.padding, cy)
      ctx.textAlign = 'right'
      ctx.fillText(op.right, W - R.padding, cy)
    } else {
      ctx.font = font(op.size, op.bold)
      ctx.fillStyle = op.faint ? R.faint : R.ink
      ctx.textAlign = op.align
      // 字间距（店名、小标题）
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${op.spacing ?? 0}px`
      const x = op.align === 'center' ? W / 2 : op.align === 'right' ? W - R.padding : R.padding
      ctx.fillText(op.text, x, cy)
      if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px'
    }
    y += h
  }
  return canvas
}
