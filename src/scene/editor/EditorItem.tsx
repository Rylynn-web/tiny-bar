import { useEffect, useRef, type ReactNode } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { Vector3, type Group, type Plane } from 'three'
import type { LayoutItem } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'
import { setControlsEnabled } from '../../state/cameraActions'
import { getLayoutItems } from '../../state/layoutStore'
import { catalog } from '../catalog'
import { markInteractiveHit } from '../interaction/tap'
import { boundsOf } from './bounds'
import { constrain, dragPlane, pickWall, rotateOffsets, round3, surfaceUnder, wallOf, wallRotation } from './dragMath'
import { wallState } from '../../state/wallVisibility'
import type { Wall } from '../room/walls'
import {
  beginTransient,
  endTransient,
  getEditorState,
  registerObject,
  select,
  transientUpdate,
  unregisterObject,
  useEditor,
} from './editorStore'

type Drag = {
  pointerId: number
  startX: number
  startY: number
  started: boolean
  plane?: Plane
  grab?: Vector3
  offMin?: Vector3
  offMax?: Vector3
}

const hit = new Vector3()

/** 编辑模式下包住每个物件：点击选中（带描边）、拖动、登记 3D 对象 */
export function EditorItem({ item, children }: { item: LayoutItem; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const drag = useRef<Drag | null>(null)
  const selected = useEditor((s) => s.selectedId === item.id)

  useEffect(() => {
    if (ref.current) registerObject(item.id, ref.current)
    return () => unregisterObject(item.id)
  }, [item.id])

  const capture = (e: ThreeEvent<PointerEvent>, on: boolean) => {
    const target = e.target as unknown as Element
    if (on) target.setPointerCapture(e.pointerId)
    else target.releasePointerCapture(e.pointerId)
  }

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return
    markInteractiveHit()
    drag.current = { pointerId: e.pointerId, startX: e.nativeEvent.clientX, startY: e.nativeEvent.clientY, started: false }
    // 精确调整模式：物件只响应点击选中，不拦截事件，让 PivotControls 手柄能收到拖动
    if (getEditorState().pivotMode) return
    e.stopPropagation()
    setControlsEnabled(false)
    capture(e, true)
  }

  const onPointerMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId || getEditorState().pivotMode) return
    e.stopPropagation()
    const current = getLayoutItems().find((i) => i.id === item.id)
    const mount = catalog[item.type]?.mount ?? 'floor'
    if (!current || !ref.current) return

    if (!d.started) {
      const moved = Math.hypot(e.nativeEvent.clientX - d.startX, e.nativeEvent.clientY - d.startY)
      if (moved <= sceneConfig.interaction.tapThreshold) return
      d.plane = dragPlane(current, mount)
      if (!e.ray.intersectPlane(d.plane, hit)) return
      const pos = new Vector3(...current.position)
      d.grab = pos.clone().sub(hit)
      const box = boundsOf(ref.current)
      d.offMin = box.min.sub(pos)
      d.offMax = box.max.sub(pos)
      d.started = true
      select(item.id)
      beginTransient()
    }

    let moving = current
    if (mount === 'wall') {
      // 墙面物件：鼠标指到哪面（显示着的）墙就贴到哪面墙，朝向跟着转
      const allowed: Wall[] = ['back']
      if (wallState.visible.left) allowed.push('left')
      if (wallState.visible.right) allowed.push('right')
      const picked = pickWall(e.ray, allowed)
      if (picked && picked.wall !== wallOf(current)) {
        const rotationY = wallRotation(picked.wall)
        const delta = rotationY - current.rotationY
        const rotated = rotateOffsets(d.offMin!, d.offMax!, delta)
        d.offMin = rotated.min
        d.offMax = rotated.max
        d.grab = rotateOffsets(d.grab!, d.grab!, delta).min
        moving = { ...current, rotationY }
        d.plane = dragPlane(moving, mount)
      }
    }

    // 台面小物件：指针下面有台面就落到台面高度，没有就落回地面（不再锁死原来的高度）
    if (mount === 'floor' && catalog[item.type]?.onSurface) {
      const s = surfaceUnder(e.ray, getLayoutItems(), item.id)
      const top = s ? s.top : 0
      if (s) hit.copy(s.point)
      else if (!e.ray.intersectPlane(dragPlane({ ...moving, position: [0, 0, 0] }, mount), hit)) return
      const target = hit.clone().add(new Vector3(d.grab!.x, 0, d.grab!.z))
      const p = constrain(moving, mount, target, d.offMin!, d.offMax!, e.shiftKey)
      transientUpdate(item.id, { position: round3([p[0], top, p[2]]) })
      return
    }

    if (!e.ray.intersectPlane(d.plane!, hit)) return
    const target = hit.clone().add(d.grab!)
    const position = constrain(moving, mount, target, d.offMin!, d.offMax!, e.shiftKey, catalog[item.type]?.lockY)
    transientUpdate(item.id, moving === current ? { position: round3(position) } : { position: round3(position), rotationY: moving.rotationY })
  }

  const finish = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    drag.current = null
    if (getEditorState().pivotMode) {
      // 只认没怎么移动的点按为"选中"，拖手柄时不切换选中
      const moved = Math.hypot(e.nativeEvent.clientX - d.startX, e.nativeEvent.clientY - d.startY)
      if (moved <= sceneConfig.interaction.tapThreshold) {
        e.stopPropagation()
        select(item.id)
      }
      return
    }
    e.stopPropagation()
    capture(e, false)
    if (d.started) endTransient()
    else select(item.id)
    setControlsEnabled(true)
  }

  return (
    <Select enabled={selected}>
      <group
        ref={ref}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {children}
      </group>
    </Select>
  )
}
