import { useMemo } from 'react'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { getCanvasTexture } from '../primitives/canvasTexture'

const Z = sceneConfig.lounge.zebraRug

/** 原创的波浪条纹：每条纹上下边各走一条正弦线，相位错开，粗细自然变化 */
function drawStripes(ctx: CanvasRenderingContext2D, n: number, light: string, dark: string) {
  ctx.fillStyle = light
  ctx.fillRect(0, 0, n, n)
  ctx.fillStyle = dark
  const band = n / Z.stripes
  const step = 4
  for (let i = 0; i < Z.stripes; i++) {
    const center = band * (i + 0.5)
    const half = (band * Z.stripeWeight) / 2
    const wave = (x: number, phase: number) =>
      Z.waveAmplitude * n * Math.sin(2 * Math.PI * ((Z.waveFrequency * x) / n + phase))
    ctx.beginPath()
    for (let x = 0; x <= n; x += step) ctx.lineTo(x, center - half + wave(x, i * 0.37))
    for (let x = n; x >= 0; x -= step) ctx.lineTo(x, center + half + wave(x, i * 0.37 + 0.12))
    ctx.closePath()
    ctx.fill()
  }
}

/** 斑马纹地毯：奶白薄板 + 顶面程序化条纹贴图。原点在地面中心，长边沿 X */
export function ZebraRug() {
  const { palette } = useSceneParams()
  const m = sceneConfig.material
  const [w, d] = Z.size
  const map = useMemo(
    () =>
      getCanvasTexture(`zebra|${palette.cream}|${palette.dark}`, Z.textureSize, (ctx, n) =>
        drawStripes(ctx, n, palette.cream, palette.dark),
      ),
    [palette.cream, palette.dark],
  )

  return (
    <group>
      <BevelBox tier="rod" size={[w, Z.thickness, d]} position={[0, Z.thickness / 2, 0]} color={palette.cream} castShadow={false} />
      <mesh position={[0, Z.thickness + Z.surfaceOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={map} roughness={m.roughness} metalness={0} envMapIntensity={m.envMapIntensity} />
      </mesh>
    </group>
  )
}
