import { useMemo } from 'react'
import { AdditiveBlending, CanvasTexture, SRGBColorSpace } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'

let texture: CanvasTexture | null = null

/** 白色径向渐变，全场景共用一张 */
export function getPoolTexture() {
  if (!texture) {
    const { textureSize: n, midStop, midAlpha } = sceneConfig.lightPool
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = n
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(midStop, `rgba(255,255,255,${midAlpha})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, n, n)
    texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
  }
  return texture
}

type Props = {
  position: [number, number, number]
  radius: number
}

/** 灯具下方的假光斑：贴在表面上的叠加渐变圆，强度随时段的 glow 倍率变化 */
export function LightPool({ position, radius }: Props) {
  const { palette, emissive } = useSceneParams()
  const { glow } = useLighting()
  const map = useMemo(() => getPoolTexture(), [])
  return (
    // 假光斑不是实体：编辑器算尺寸、拖动边界和重叠时跳过
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} userData={{ editorIgnore: true }} raycast={() => null}>
      <planeGeometry args={[radius * 2, radius * 2]} />
      <meshBasicMaterial
        map={map}
        color={palette.warmLight}
        transparent
        opacity={Math.min(1, emissive.pool * glow)}
        blending={AdditiveBlending}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-2}
      />
    </mesh>
  )
}
