import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshBasicMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats, type Seat } from '../config/seatConfig'
import { takeSeat } from '../state/flowActions'
import { useGuests } from '../state/guests'
import { useSceneParams } from '../state/sceneParams'
import { OverlayMeshes, useItemMeshes } from './ItemOverlay'

const C = sceneConfig.seatPicker

/**
 * 选座阶段：每件还有空位的可坐家具套一层半透明绿色蒙版（复制家具本身的形状），慢慢呼吸；
 * 点蒙版就坐到这件家具上离点击处最近的空位。离开选座阶段这个组件就卸载，家具恢复原样。
 */
export function SeatPicker() {
  const seats = useSeats()
  const guests = useGuests()
  const { palette } = useSceneParams()

  // 每件家具上空着的座位
  const free = useMemo(() => {
    const map = new Map<string, Seat[]>()
    for (const s of seats) {
      if (guests[s.id]) continue
      const list = map.get(s.itemId)
      if (list) list.push(s)
      else map.set(s.itemId, [s])
    }
    return map
  }, [seats, guests])
  const targets = useItemMeshes([...free.keys()])

  const material = useMemo(
    () => new MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    [],
  )
  useEffect(() => {
    material.color.set(palette[C.color])
  }, [material, palette])
  useEffect(() => () => material.dispose(), [material])

  // 不透明度呼吸
  useFrame(({ clock }) => {
    const t = (Math.sin((clock.elapsedTime / C.pulseSeconds) * Math.PI * 2) + 1) / 2
    material.opacity = C.opacity[0] + (C.opacity[1] - C.opacity[0]) * t
  })

  return (
    <OverlayMeshes
      targets={targets}
      material={material}
      onTap={(itemId, e) => {
        const list = free.get(itemId)
        if (!list?.length) return
        // 沙发这种一件有两个座位的：坐离点击处最近的那个空位
        const p = e.point
        const best = list.reduce((a, b) =>
          Math.hypot(a.position[0] - p.x, a.position[2] - p.z) <= Math.hypot(b.position[0] - p.x, b.position[2] - p.z) ? a : b,
        )
        takeSeat(best.id)
      }}
    />
  )
}
