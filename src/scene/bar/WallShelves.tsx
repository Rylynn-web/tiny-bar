import { useMemo } from 'react'
import { TorusGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { InstancedMatte, type InstanceItem } from '../primitives/InstancedLathe'
import { getLathe } from '../primitives/useLathe'

const B = sceneConfig.bar
const S = B.shelves
const wallZ = -sceneConfig.room.depth / 2
const itemZ = wallZ + S.depth / 2

/** 在一块板上均匀排 count 个物件的 x 坐标 */
function spread(cx: number, width: number, count: number) {
  const step = width / count
  return Array.from({ length: count }, (_, i) => cx - width / 2 + step * (i + 0.5))
}

/** 半圆把手（开口朝杯身），放在杯子 +X 一侧 */
function useHandleGeometry(radius: number, tube: number) {
  return useMemo(() => {
    const g = new TorusGeometry(radius, tube, 6, 8, Math.PI)
    g.rotateZ(-Math.PI / 2)
    return g
  }, [radius, tube])
}

/** 后墙浮板置物架 + 实例化的杯子和酒瓶 */
export function WallShelves() {
  const { palette } = useSceneParams()

  const { mugs, mugHandles, cups, cupHandles, bottles } = useMemo(() => {
    const mugs: InstanceItem[] = []
    const mugHandles: InstanceItem[] = []
    const cups: InstanceItem[] = []
    const cupHandles: InstanceItem[] = []
    const bottles: InstanceItem[][] = B.bottles.profiles.map(() => [])
    let bottleIndex = 0

    for (const row of S.rows) {
      if (row.items === 'mug' || row.items === 'cup') {
        const spec = row.items === 'mug' ? B.mug : B.cup
        const bodies = row.items === 'mug' ? mugs : cups
        const handles = row.items === 'mug' ? mugHandles : cupHandles
        const outer = Math.max(...spec.profile.map((p) => p[0]))
        const height = Math.max(...spec.profile.map((p) => p[1]))
        spread(row.x, row.width, spec.count).forEach((x, i) => {
          const color = palette[spec.colors[i % spec.colors.length]]
          bodies.push({ position: [x, row.y, itemZ], color })
          handles.push({ position: [x + outer, row.y + height / 2, itemZ], color })
        })
      } else {
        spread(row.x, row.width, B.bottles.perShelf).forEach((x) => {
          const shape = bottleIndex % B.bottles.profiles.length
          const color = palette[B.bottles.colors[bottleIndex % B.bottles.colors.length]]
          bottles[shape].push({ position: [x, row.y, itemZ], color })
          bottleIndex++
        })
      }
    }
    return { mugs, mugHandles, cups, cupHandles, bottles }
  }, [palette])

  const mugHandleGeo = useHandleGeometry(B.mug.handleRadius, B.mug.handleTube)
  const cupHandleGeo = useHandleGeometry(B.cup.handleRadius, B.cup.handleTube)

  return (
    <group>
      {S.rows.map((row, i) => (
        <BevelBox
          key={i}
          tier="small"
          size={[row.width, S.thickness, S.depth]}
          position={[row.x, row.y - S.thickness / 2, itemZ]}
          color={palette.dark}
        />
      ))}
      <InstancedMatte geometry={getLathe(B.mug.profile, sceneConfig.detail.smallLatheSegments)} items={mugs} />
      <InstancedMatte geometry={mugHandleGeo} items={mugHandles} />
      <InstancedMatte geometry={getLathe(B.cup.profile, sceneConfig.detail.smallLatheSegments)} items={cups} />
      <InstancedMatte geometry={cupHandleGeo} items={cupHandles} />
      {B.bottles.profiles.map((profile, i) => (
        <InstancedMatte key={i} geometry={getLathe(profile, sceneConfig.detail.smallLatheSegments)} items={bottles[i]} />
      ))}
    </group>
  )
}
