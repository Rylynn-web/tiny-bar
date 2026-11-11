import { useMemo } from 'react'
import { TorusGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { InstancedMatte, type InstanceItem } from '../primitives/InstancedLathe'
import { getLathe } from '../primitives/useLathe'
import type { CatalogProps } from '../catalogTypes'

const B = sceneConfig.bar
const S = B.shelf
const small = sceneConfig.detail.smallLatheSegments
const itemZ = S.depth / 2

/** 在板上均匀排 count 个物件的 x 坐标 */
function spread(width: number, count: number) {
  const step = width / count
  return Array.from({ length: count }, (_, i) => -width / 2 + step * (i + 0.5))
}

// 半圆把手（开口朝杯身），放在杯子 +X 一侧；全场景共用
const handleCache = new Map<string, TorusGeometry>()
function getHandle(radius: number, tube: number) {
  const key = `${radius}|${tube}`
  let g = handleCache.get(key)
  if (!g) {
    g = new TorusGeometry(radius, tube, 6, 8, Math.PI)
    g.rotateZ(-Math.PI / 2)
    handleCache.set(key, g)
  }
  return g
}

/**
 * 浮板置物架（墙面物件）：一块深色浮板 + 实例化的杯子或酒瓶。
 * 原点在墙面上、板面高度处，局部 +Z 朝向室内。
 * props：items = 'mug' | 'cup' | 'bottle'，width = 板长（米），seed = 酒瓶颜色起始偏移
 */
export function WallShelf({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const width = typeof props.width === 'number' ? props.width : S.defaultWidth
  const kind = props.items === 'cup' || props.items === 'bottle' ? props.items : 'mug'
  const seed = typeof props.seed === 'number' ? props.seed : 0

  const groups = useMemo(() => {
    if (kind === 'bottle') {
      const perShape: InstanceItem[][] = B.bottles.profiles.map(() => [])
      const count = Math.max(1, Math.round(width * B.bottles.perMeter))
      spread(width, count).forEach((x, i) => {
        const shape = i % B.bottles.profiles.length
        const color = palette[B.bottles.colors[(i + seed) % B.bottles.colors.length]]
        perShape[shape].push({ position: [x, 0, itemZ], color })
      })
      return B.bottles.profiles.map((profile, i) => ({ geometry: getLathe(profile, small), items: perShape[i] }))
    }
    const spec = kind === 'cup' ? B.cup : B.mug
    const outer = Math.max(...spec.profile.map((p) => p[0]))
    const height = Math.max(...spec.profile.map((p) => p[1]))
    const bodies: InstanceItem[] = []
    const handles: InstanceItem[] = []
    const count = Math.max(1, Math.round(width * spec.perMeter))
    spread(width, count).forEach((x, i) => {
      const color = palette[spec.colors[i % spec.colors.length]]
      bodies.push({ position: [x, 0, itemZ], color })
      handles.push({ position: [x + outer, height / 2, itemZ], color })
    })
    return [
      { geometry: getLathe(spec.profile, small), items: bodies },
      { geometry: getHandle(spec.handleRadius, spec.handleTube), items: handles },
    ]
  }, [kind, width, seed, palette])

  return (
    <group>
      <BevelBox
        tier="small"
        size={[width, S.thickness, S.depth]}
        position={[0, -S.thickness / 2, itemZ]}
        color={palette.dark}
      />
      {groups.map((g, i) => (
        <InstancedMatte key={`${kind}-${i}`} geometry={g.geometry} items={g.items} />
      ))}
    </group>
  )
}
