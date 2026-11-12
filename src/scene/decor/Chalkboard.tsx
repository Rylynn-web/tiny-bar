import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { useFlow } from '../../state/flow'
import { copy } from '../../ui/copy'
import { BevelBox } from '../primitives/BevelBox'
import { Matte } from '../primitives/Matte'
import type { CatalogProps } from '../catalogTypes'

const C = sceneConfig.chalkboard

/**
 * 门口的 A 字小黑板：两块木框黑板靠在一起，正面（+Z）写粉笔字。
 * 平时写店名和"白天咖啡、晚上喝酒"；进店后写出分配给你的称号。原点在地面中心。
 */
export function Chalkboard(_: CatalogProps) {
  const { palette, timeOfDay } = useSceneParams()
  const { title, phase } = useFlow()
  // 离开、看小票之后黑板回到平时的样子
  const shown = title && phase !== 'entry' && phase !== 'receipt' && phase !== 'ended' ? title : null

  const map = useMemo(
    () => drawBoard(shown, timeOfDay === 'day', palette[C.boardColor], palette[C.chalkColor], palette[C.accentColor]),
    [shown, timeOfDay, palette],
  )
  useEffect(() => () => map.dispose(), [map])

  const top = C.bottom + C.height * Math.cos(C.tilt)
  const frameSize: [number, number, number] = [C.width, C.height, C.thickness]
  const face: [number, number] = [C.width - C.frame * 2, C.height - C.frame * 2]
  return (
    <group position={[0, top, 0]}>
      {/* 正面：板子底部往外（+Z）张开 */}
      <group rotation={[-C.tilt, 0, 0]}>
        <BevelBox tier="rod" size={frameSize} position={[0, -C.height / 2, C.thickness / 2]} color={palette[C.frameColor]} />
        {/* 写字的板面不参与合并：称号变了贴图要跟着换 */}
        <mesh position={[0, -C.height / 2, C.thickness + 0.0008]} receiveShadow userData={{ noMerge: true }}>
          <planeGeometry args={face} />
          <meshStandardMaterial map={map} roughness={0.95} metalness={0} envMapIntensity={sceneConfig.material.envMapIntensity} />
        </mesh>
      </group>
      {/* 背面：另一块板往后张开，背面不写字 */}
      <group rotation={[C.tilt, 0, 0]}>
        <BevelBox tier="rod" size={frameSize} position={[0, -C.height / 2, -C.thickness / 2]} color={palette[C.frameColor]} />
        {/* 背面板面：4 毫米薄片，直接用方块 */}
        <mesh position={[0, -C.height / 2, -C.thickness - 0.002]} receiveShadow>
          <boxGeometry args={[face[0], face[1], 0.004]} />
          <Matte color={palette[C.boardColor]} />
        </mesh>
      </group>
    </group>
  )
}

/** 画板面：深色底 + 粉笔字（半透明叠几层，带一点粉笔的毛糙感） */
function drawBoard(title: string | null, day: boolean, board: string, chalk: string, accent: string) {
  const [w, h] = C.textureSize
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = board
  ctx.fillRect(0, 0, w, h)
  // 擦过的粉笔灰
  ctx.globalAlpha = 0.06
  ctx.fillStyle = chalk
  for (let i = 0; i < 5; i++) ctx.fillRect(w * 0.1, h * (0.15 + i * 0.16), w * 0.8, h * 0.05)
  ctx.globalAlpha = 1

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chalkText = (text: string, size: number, y: number, color = chalk) => {
    ctx.font = `${size}px ${C.font}`
    // 最长不超过板面宽度
    const width = ctx.measureText(text).width
    if (width > w * 0.86) ctx.font = `${Math.floor((size * w * 0.86) / width)}px ${C.font}`
    ctx.fillStyle = color
    ctx.globalAlpha = 0.9
    ctx.fillText(text, w / 2, y)
    ctx.globalAlpha = 0.25
    ctx.fillText(text, w / 2 + 1.5, y + 1)
    ctx.globalAlpha = 1
  }
  const squiggle = (y: number) => {
    ctx.strokeStyle = accent
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    for (let x = w * 0.28; x <= w * 0.72; x += 4) {
      const yy = y + Math.sin((x / w) * Math.PI * 8) * 4
      if (x === w * 0.28) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  if (title) {
    const [adj, ...rest] = title.split(' ')
    chalkText(day ? copy.chalkboard.greetingDay : copy.chalkboard.greeting, 34, h * 0.24)
    squiggle(h * 0.34)
    chalkText(adj, 64, h * 0.5, accent)
    chalkText(rest.join(' '), 64, h * 0.66, accent)
  } else {
    chalkText(copy.chalkboard.idleTitle, 60, h * 0.3)
    squiggle(h * 0.42)
    copy.chalkboard.idleLines.forEach((line, i) => chalkText(line, 34, h * (0.56 + i * 0.12)))
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}
