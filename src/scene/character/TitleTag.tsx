import { useEffect, useMemo, type RefObject } from 'react'
import { CanvasTexture, SRGBColorSpace, type Mesh } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

const T = sceneConfig.titleTag

/** 画称号牌：圆角深色底 + 浅色字，宽度按文字长度 */
function drawTag(title: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  ctx.font = T.font
  const h = T.textureHeight
  const w = Math.min(512, Math.ceil(ctx.measureText(title).width + T.paddingX * 2))
  canvas.width = w
  canvas.height = h
  ctx.fillStyle = T.background
  ctx.beginPath()
  ctx.roundRect(1, 1, w - 2, h - 2, (h - 2) / 2)
  ctx.fill()
  ctx.font = T.font
  ctx.fillStyle = T.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, w / 2, h / 2 + 1)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return { tex, aspect: w / h }
}

/**
 * 头顶的称号标签（只给自己显示）：一块正对镜头的小牌子，不受光照。
 * 位置由 Guests.tsx 每帧写进 meshRef 的矩阵（跟着头走、始终朝向镜头）
 */
export function TitleTag({ title, meshRef }: { title: string; meshRef: RefObject<Mesh | null> }) {
  const { tex, aspect } = useMemo(() => drawTag(title), [title])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh ref={meshRef} matrixAutoUpdate={false} frustumCulled={false} renderOrder={9} visible={false}>
      <planeGeometry args={[T.height * aspect, T.height]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  )
}
