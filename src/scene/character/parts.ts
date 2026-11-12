import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  LatheGeometry,
  PlaneGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buddyShape as S, sceneConfig } from '../../config/sceneConfig'

// 小人零件和道具的共享几何体：所有小人共用一份（实例化绘制），只在模块加载时生成一次。
// 小人零件用设计单位（全身高 2.8），道具用米。

export const BODY_BOTTOM = S.bodyProfile[0][1]
const P = sceneConfig.buddy.props
const D = sceneConfig.buddy.detail

/** 身体（旋转体）+ 脖子，合成一块；原点在世界原点（设计坐标），由"身体"节点放到位 */
function bodyGeometry() {
  const curve = new CatmullRomCurve3(
    S.bodyProfile.map(([r, y]) => new Vector3(r, y, 0)),
    false,
    'centripetal',
  )
  const pts = curve.getPoints(D.bodyProfilePoints).map((p) => new Vector2(Math.max(0, p.x), p.y))
  const body = new LatheGeometry(pts, D.bodySegments)
  body.computeVertexNormals()
  const neck = new CylinderGeometry(S.neck.radius, S.neck.radius, S.neck.top - S.neck.bottom, D.bodySegments, 1, true).translate(
    0,
    (S.neck.bottom + S.neck.top) / 2,
    0,
  )
  return mergeGeometries([body, neck])!
}

/** 胶囊（腿 / 手臂），从支点向下延伸 */
const limb = (radius: number, length: number) =>
  new CapsuleGeometry(radius, length, D.limbSegments[0], D.limbSegments[1]).translate(0, -length / 2, 0)

/** 头：压扁一点的球，原点在头中心 */
function headGeometry() {
  return new SphereGeometry(S.head.radius, D.headSegments[0], D.headSegments[1]).scale(1, S.head.squashY, 1)
}

/** 眼睛的中心高度（相对头中心）：眼睛贴片眨眼时绕这个高度沿 Y 压扁 */
export const EYE_Y = (S.head.radius - S.eye.inset) * Math.sin(S.eye.pitch) * S.head.squashY

/**
 * 脸部贴片：从（压扁的）头部球面上切下来的一小块，离头面 lift，贴合球面弧度。
 * UV 和表情图集的格子一一对应：u = 观看者的左 → 右（左右角度），v = 下 → 上（上下角度）。原点在头中心，再整体下移 shiftY
 */
function faceGeometry(lift: number, shiftY: number) {
  const F = sceneConfig.buddy.face
  const [nx, ny] = F.segments
  const r = S.head.radius + lift
  const pos: number[] = []
  const nor: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const rad = Math.PI / 180
  for (let j = 0; j <= ny; j++) {
    const v = j / ny
    const pitch = (F.pitchRange[0] + v * (F.pitchRange[1] - F.pitchRange[0])) * rad
    for (let i = 0; i <= nx; i++) {
      const u = i / nx
      // u = 0 在观看者的左边 = 小人自己的右边（-X 那侧往 +X 反过来），所以角度从 +yawRange 走到 -yawRange
      const yaw = (F.yawRange - u * 2 * F.yawRange) * rad
      const d = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch))
      pos.push(d.x * r, d.y * r * S.head.squashY - shiftY, d.z * r)
      nor.push(d.x, d.y, d.z)
      uv.push(u, v)
    }
  }
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i
      const b = a + 1
      const c = a + nx + 1
      const e = c + 1
      idx.push(a, c, b, b, c, e)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3))
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** 给几何体整块刷上顶点颜色（多块颜色不同的零件合成一个网格用） */
function paint(g: BufferGeometry, color: string) {
  const c = new Color(color)
  const n = g.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) c.toArray(arr, i * 3)
  g.setAttribute('color', new BufferAttribute(arr, 3))
  return g
}

/**
 * 摊开的书的一半（右半边，左半边绕 Y 转 180° 复用）：书页 + 下面一层封皮。
 * 书的局部坐标：书脊沿 Z，书页朝 +Y，往 +X 展开
 */
export function bookHalfGeometry(pageColor: string, coverColor: string) {
  const b = P.book
  const w = b.width / 2
  const pages = paint(new BoxGeometry(w, b.thickness, b.height).translate(w / 2, b.thickness / 2, 0), pageColor)
  const cover = paint(
    new BoxGeometry(w + 0.006, b.thickness * 0.3, b.height + 0.008).translate(w / 2 + 0.003, -b.thickness * 0.15, 0),
    coverColor,
  )
  const g = mergeGeometries([pages.toNonIndexed(), cover.toNonIndexed()])!
  g.rotateZ(b.openAngle)
  return g
}

/** 翻动的那一页：贴在右半边书页上面，绕书脊（Z 轴）翻到左边 */
const pageGeometry = () => {
  const b = P.book
  const w = b.width / 2
  return new PlaneGeometry(w * 0.96, b.height * 0.94).rotateX(-Math.PI / 2).translate(w * 0.5, b.thickness + 0.001, 0)
}

/** 笔记本：底座（原点在底座底面中心，+Z 朝向使用的人）、屏幕盖（原点在后沿的合页处，合上时向 +Z 铺开）、屏幕 */
const laptopBase = () => {
  const L = P.laptop
  return new BoxGeometry(L.width, L.baseThickness, L.depth).translate(0, L.baseThickness / 2, 0)
}
const laptopLid = () => {
  const L = P.laptop
  return new BoxGeometry(L.width, L.lidThickness, L.depth).translate(0, L.lidThickness / 2, L.depth / 2)
}
const laptopScreen = () => {
  const L = P.laptop
  // 屏幕在盖子内侧（合上时朝下的那一面）
  return new PlaneGeometry(L.width - L.screenInset * 2, L.depth - L.screenInset * 2)
    .rotateX(Math.PI / 2)
    .translate(0, -0.0006, L.depth / 2)
}

/** "…" 气泡：圆角白底 + 三个点（贴图只画一次） */
export function bubbleTexture() {
  const B = P.bubble
  const n = B.textureSize
  const w = n
  const h = Math.round((n * B.height) / B.width)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const r = h * 0.42
  ctx.fillStyle = B.color
  ctx.beginPath()
  ctx.roundRect(2, 2, w - 4, h * 0.8 - 2, r)
  ctx.fill()
  // 底部的小尾巴
  ctx.beginPath()
  ctx.moveTo(w * 0.42, h * 0.78)
  ctx.lineTo(w * 0.5, h - 2)
  ctx.lineTo(w * 0.58, h * 0.78)
  ctx.fill()
  ctx.fillStyle = B.dotColor
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.arc(w / 2 + i * w * 0.2, h * 0.4, h * 0.09, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** 所有共享几何体（模块级缓存，只生成一次） */
export const partGeometry = {
  body: bodyGeometry(),
  leg: limb(S.leg.radius, S.leg.length),
  arm: limb(S.arm.radius, S.arm.length),
  head: headGeometry(),
  // 眼睛贴片（原点在眼睛那一行，方便眨眼时沿 Y 压扁）、腮红贴片（原点在头中心）
  eyes: faceGeometry(sceneConfig.buddy.face.eyesLift, EYE_Y),
  cheeks: faceGeometry(sceneConfig.buddy.face.cheeksLift, 0),
  page: pageGeometry(),
  laptopBase: laptopBase(),
  laptopLid: laptopLid(),
  laptopScreen: laptopScreen(),
  bubble: new PlaneGeometry(P.bubble.width, P.bubble.height),
}
