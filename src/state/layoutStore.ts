import { useSyncExternalStore } from 'react'
import layoutFile from '../config/layout.json'
import type { LayoutFile, LayoutItem, RoomSize } from '../config/layoutTypes'
import { sceneConfig } from '../config/sceneConfig'

// 场景布局状态（物件 + 房间尺寸）。运行时只读 layout.json；开发环境的编辑器会通过 set* 修改它。

const file = layoutFile as LayoutFile
const R = sceneConfig.room

/** 文件里保存的那一版 */
export const fileLayoutItems = file.items
export const fileRoom: RoomSize = {
  width: file.room?.width ?? R.width,
  depth: file.room?.depth ?? R.depth,
}

let items: LayoutItem[] = fileLayoutItems
let room: RoomSize = fileRoom
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function getLayoutItems() {
  return items
}
export function setLayoutItems(next: LayoutItem[]) {
  items = next
  emit()
}
export function getRoom() {
  return room
}
export function setRoom(next: RoomSize) {
  room = next
  emit()
}

export function subscribeLayout(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useLayoutItems() {
  return useSyncExternalStore(subscribeLayout, getLayoutItems)
}
export function useRoom() {
  return useSyncExternalStore(subscribeLayout, getRoom)
}

export type RoomBounds = {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
  width: number
  depth: number
  centerX: number
  centerZ: number
}

/** 房间地面范围：左后角固定（默认房间的左后角），宽度向右、进深向前 */
export function roomBounds(r: RoomSize = room): RoomBounds {
  const minX = -R.width / 2
  const minZ = -R.depth / 2
  return {
    minX,
    maxX: minX + r.width,
    minZ,
    maxZ: minZ + r.depth,
    width: r.width,
    depth: r.depth,
    centerX: minX + r.width / 2,
    centerZ: minZ + r.depth / 2,
  }
}

export function useRoomBounds() {
  const r = useRoom()
  return roomBounds(r)
}
