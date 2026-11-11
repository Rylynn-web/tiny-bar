import { useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { setRaycastable, wallState } from '../../state/wallVisibility'
import type { SideWall } from './walls'

/** 挂在左墙 / 右墙上的物件：墙不显示时一起隐藏，并且不参与点击检测 */
export function SideWallItem({ side, children }: { side: SideWall; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const shown = useRef(true)
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const show = wallState.visible[side]
    if (show === shown.current) return
    shown.current = show
    g.visible = show
    setRaycastable(g, show)
  })
  return <group ref={ref}>{children}</group>
}
