import { useEffect, useMemo, type RefObject } from 'react'
import { CanvasTexture, SRGBColorSpace, type Mesh } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

const N = sceneConfig.musicNote

/** 画一个圆形小牌子 + ♪（用线条画，不依赖字体） */
function drawNote() {
  const n = N.textureSize
  const canvas = document.createElement('canvas')
  canvas.width = n
  canvas.height = n
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = N.background
  ctx.beginPath()
  ctx.arc(n / 2, n / 2, n / 2 - 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = N.color
  ctx.strokeStyle = N.color
  ctx.lineWidth = n * 0.07
  ctx.lineCap = 'round'
  // 符头
  ctx.beginPath()
  ctx.ellipse(n * 0.42, n * 0.68, n * 0.12, n * 0.09, -0.4, 0, Math.PI * 2)
  ctx.fill()
  // 符干 + 符尾
  ctx.beginPath()
  ctx.moveTo(n * 0.52, n * 0.66)
  ctx.lineTo(n * 0.52, n * 0.22)
  ctx.quadraticCurveTo(n * 0.6, n * 0.34, n * 0.7, n * 0.36)
  ctx.stroke()
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/**
 * 头顶的小音符：只在放歌的那个人头上（店里同时只有一个人在放歌，所以只要一块面片）。
 * 位置由 Guests.tsx 每帧写进 meshRef 的矩阵
 */
export function MusicNote({ meshRef, paused }: { meshRef: RefObject<Mesh | null>; paused: boolean }) {
  const tex = useMemo(() => drawNote(), [])
  useEffect(() => () => tex.dispose(), [tex])
  return (
    <mesh ref={meshRef} matrixAutoUpdate={false} frustumCulled={false} renderOrder={9} visible={false}>
      <planeGeometry args={[N.size, N.size]} />
      <meshBasicMaterial map={tex} transparent opacity={paused ? N.pausedOpacity : 1} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
  )
}
