import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { menuAtlasOrder, menuItems, type MenuId } from '../../config/menu'

// 桌上的饮品 / 小食：所有菜品画进一张图集（4 × 2 格），每个实例按自己的格子取图，
// 所有人的饮品一组实例、小食一组实例，8 个人也只多 2 次绘制。

const O = sceneConfig.order
export const ATLAS_COLS = 4
export const ATLAS_ROWS = 2

/** 第几格（按 menuAtlasOrder）在贴图坐标里的左下角 */
export function menuCell(id: MenuId): [number, number] {
  const i = menuAtlasOrder.indexOf(id)
  const col = i % ATLAS_COLS
  const row = Math.floor(i / ATLAS_COLS)
  return [col / ATLAS_COLS, 1 - (row + 1) / ATLAS_ROWS]
}

let atlas: CanvasTexture | null = null

/**
 * 菜品图集（只生成一次）：图片异步加载，加载完一张画一张。
 * 原图底部的留白不一样，这里按不透明像素的最下沿对齐到格子底部，放在桌上就不会悬空
 */
export function getMenuAtlas() {
  if (atlas) return atlas
  const cell = O.atlasCell
  const canvas = document.createElement('canvas')
  canvas.width = cell * ATLAS_COLS
  canvas.height = cell * ATLAS_ROWS
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  atlas = tex
  menuAtlasOrder.forEach((id, i) => {
    const img = new Image()
    img.onload = () => {
      const x = (i % ATLAS_COLS) * cell
      const y = Math.floor(i / ATLAS_COLS) * cell
      ctx.drawImage(img, x, y, cell, cell)
      // 找最下面一行不透明像素，整张往下挪到贴底
      const data = ctx.getImageData(x, y, cell, cell).data
      let bottom = cell - 1
      outer: for (; bottom >= 0; bottom--) for (let c = 0; c < cell; c++) if (data[(bottom * cell + c) * 4 + 3] > 16) break outer
      const shift = cell - 1 - bottom
      if (shift > 0) {
        ctx.clearRect(x, y, cell, cell)
        ctx.drawImage(img, x, y + shift, cell, cell)
      }
      tex.needsUpdate = true
    }
    img.src = menuItems[id].image
  })
  return tex
}

/** 1 × 1 的竖直面片，原点在底边中点（图片贴底放在桌面上） */
export function menuPlaneGeometry() {
  const g = new PlaneGeometry(1, 1)
  g.translate(0, 0.5, 0)
  return g
}

/**
 * 菜品材质：不受光照（白天晚上都是原图的颜色），透明边缘；不写深度，环境光遮蔽就不会在图片上压出暗影。
 * 贴图坐标按每个实例的格子偏移
 */
export function createMenuMaterial() {
  const m = new MeshBasicMaterial({
    map: getMenuAtlas(),
    transparent: true,
    alphaTest: 0.05,
    depthWrite: false,
  })
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 instanceCell;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = vMapUv * vec2(${(1 / ATLAS_COLS).toFixed(4)}, ${(1 / ATLAS_ROWS).toFixed(4)}) + instanceCell;\n#endif`,
      )
  }
  return m
}
