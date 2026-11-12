import { useSyncExternalStore } from 'react'
import type { Object3D } from 'three'
import type { LayoutItem, RoomSize } from '../../config/layoutTypes'
import { editorConfig } from '../../config/editorConfig'
import { fileLayoutItems, fileRoom, getLayoutItems, getRoom, setLayoutItems, setRoom } from '../../state/layoutStore'
import { catalog } from '../catalog'
import { normalizeDeg, roomLimits, wallOf } from './dragMath'

// 编辑器状态：选中、撤销历史、未保存标记、本地备份、保存。只在开发环境 ?edit 下加载。

const E = editorConfig

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type EditorState = {
  selectedId: string | null
  pivotMode: boolean
  dirty: boolean
  canUndo: boolean
  saveStatus: SaveStatus
  saveMessage: string
  /** 本地备份和文件不一致时，等用户选择恢复或丢弃 */
  backup: Snapshot | null
}

/** 一份完整布局：物件 + 房间尺寸（撤销、备份、保存都以它为单位） */
export type Snapshot = { items: LayoutItem[]; room: RoomSize }

const snapJson = (s: Snapshot) => JSON.stringify({ room: s.room, items: s.items })
let savedJson = snapJson({ items: fileLayoutItems, room: fileRoom })

function current(): Snapshot {
  return { items: getLayoutItems(), room: getRoom() }
}

function readBackup(): Snapshot | null {
  try {
    const raw = localStorage.getItem(E.backupKey)
    if (!raw) return null
    const data = JSON.parse(raw)
    // 兼容旧格式（只有物件数组）
    const snap: Snapshot = Array.isArray(data) ? { items: data, room: fileRoom } : { items: data.items, room: data.room ?? fileRoom }
    return snapJson(snap) === savedJson ? null : snap
  } catch {
    return null
  }
}

let state: EditorState = {
  selectedId: null,
  pivotMode: false,
  dirty: false,
  canUndo: false,
  saveStatus: 'idle',
  saveMessage: '',
  backup: readBackup(),
}
const listeners = new Set<() => void>()

function patch(p: Partial<EditorState>) {
  state = { ...state, ...p }
  listeners.forEach((l) => l())
}

export function useEditor<T>(selector: (s: EditorState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => selector(state),
  )
}

export function getEditorState() {
  return state
}

// ── 物件 3D 对象登记（算包围盒用）──
const objects = new Map<string, Object3D>()
export function registerObject(id: string, obj: Object3D) {
  objects.set(id, obj)
}
export function unregisterObject(id: string) {
  objects.delete(id)
}
export function getObjects() {
  return objects
}

// ── 本地备份 ──
let backupTimer: ReturnType<typeof setTimeout> | undefined
function scheduleBackup(snap: Snapshot) {
  clearTimeout(backupTimer)
  backupTimer = setTimeout(() => {
    try {
      localStorage.setItem(E.backupKey, snapJson(snap))
    } catch {
      // 隐私模式等情况下写不进去，忽略
    }
  }, 300)
}

// ── 修改布局 ──
const history: Snapshot[] = []
let transientBase: Snapshot | null = null

function apply(s: Snapshot) {
  if (s.items !== getLayoutItems()) setLayoutItems(s.items)
  if (s.room !== getRoom()) setRoom(s.room)
}

function afterChange() {
  const s = current()
  const ids = new Set(s.items.map((i) => i.id))
  patch({
    dirty: snapJson(s) !== savedJson,
    canUndo: history.length > 0,
    selectedId: state.selectedId && ids.has(state.selectedId) ? state.selectedId : null,
    saveStatus: 'idle',
  })
  scheduleBackup(s)
}

function pushHistory(s: Snapshot) {
  history.push(s)
  if (history.length > E.historyLimit) history.shift()
}

function commitSnap(next: Snapshot) {
  pushHistory(current())
  apply(next)
  afterChange()
}

function commit(nextItems: LayoutItem[]) {
  commitSnap({ items: nextItems, room: getRoom() })
}

function mapItem(id: string, fn: (item: LayoutItem) => LayoutItem) {
  return getLayoutItems().map((i) => (i.id === id ? fn(i) : i))
}

export function updateItem(id: string, p: Partial<LayoutItem>) {
  commit(mapItem(id, (i) => ({ ...i, ...p })))
}

/** 拖动 / 拖滑杆开始：记下起点，过程中的更新不进历史，松手时整体算一步 */
export function beginTransient() {
  transientBase = current()
}
export function transientUpdate(id: string, p: Partial<LayoutItem>) {
  setLayoutItems(mapItem(id, (i) => ({ ...i, ...p })))
  patch({ dirty: true })
}
/** 改物件的一个 props 数值（侧边栏里的可编辑属性）；不在拖动中时直接算一步 */
export function updateProp(id: string, key: string, value: number) {
  const next = mapItem(id, (i) => ({ ...i, props: { ...i.props, [key]: value } }))
  if (transientBase) {
    setLayoutItems(next)
    patch({ dirty: true })
  } else commit(next)
}
/** 改房间尺寸；不在拖动中时直接算一步 */
export function updateRoom(room: RoomSize) {
  if (transientBase) {
    setRoom(room)
    patch({ dirty: true })
  } else commitSnap({ items: getLayoutItems(), room })
}
export function endTransient() {
  const base = transientBase
  transientBase = null
  if (!base) return
  const now = current()
  if (base.items !== now.items || base.room !== now.room) pushHistory(base)
  afterChange()
}

export function undo() {
  const prev = history.pop()
  if (!prev) return
  apply(prev)
  afterChange()
}

export function select(id: string | null) {
  if (state.selectedId !== id) patch({ selectedId: id })
}

export function togglePivot() {
  patch({ pivotMode: !state.pivotMode })
}

function selectedItem() {
  return getLayoutItems().find((i) => i.id === state.selectedId) ?? null
}

/** 旋转选中的地面物件（墙面物件的朝向由墙决定，不能转） */
export function rotateSelected(direction: 1 | -1 = 1) {
  const item = selectedItem()
  if (!item || catalog[item.type]?.mount !== 'floor') return
  updateItem(item.id, { rotationY: normalizeDeg(item.rotationY + direction * E.rotateStepDeg) })
}

function newId(type: string) {
  const ids = new Set(getLayoutItems().map((i) => i.id))
  let n = 1
  while (ids.has(`${type}-${n}`)) n++
  return `${type}-${n}`
}

export function duplicateSelected() {
  const item = selectedItem()
  if (!item) return
  const entry = catalog[item.type]
  const o = E.duplicateOffset
  const [x, y, z] = item.position
  const position: LayoutItem['position'] =
    entry?.mount === 'wall'
      ? wallOf(item) !== 'back'
        ? [x, y, z + o]
        : [x + o, y, z]
      : [x + o, y, z + o]
  const copy: LayoutItem = { ...item, id: newId(item.type), position, props: item.props && { ...item.props } }
  commit([...getLayoutItems(), copy])
  select(copy.id)
}

export function deleteSelected() {
  const item = selectedItem()
  if (!item) return
  commit(getLayoutItems().filter((i) => i.id !== item.id))
  select(null)
}

/** 添加物件：地面物件放房间中央，墙面物件放后墙中间 */
export function addItem(type: string) {
  const entry = catalog[type]
  if (!entry) return
  const item: LayoutItem = {
    id: newId(type),
    type,
    position: (() => {
      const room = roomLimits()
      return entry.mount === 'wall' ? [room.centerX, E.wallItemY, room.minZ] : [room.centerX, 0, room.centerZ]
    })() as LayoutItem['position'],
    rotationY: 0,
    ...(entry.defaultProps ? { props: { ...entry.defaultProps } } : {}),
  }
  commit([...getLayoutItems(), item])
  select(item.id)
}

// ── 保存 / 备份 ──
export async function save() {
  const snap = current()
  patch({ saveStatus: 'saving', saveMessage: '' })
  try {
    const res = await fetch(E.saveEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: snap.room, items: snap.items }),
    })
    if (!res.ok) throw new Error(await res.text())
    savedJson = snapJson(snap)
    try {
      localStorage.removeItem(E.backupKey)
    } catch {
      // 忽略
    }
    patch({ saveStatus: 'saved', saveMessage: '已写入 layout.json', dirty: false })
  } catch (err) {
    patch({ saveStatus: 'error', saveMessage: err instanceof Error ? err.message : String(err) })
  }
}

export function restoreBackup() {
  const snap = state.backup
  if (!snap) return
  patch({ backup: null })
  commitSnap(snap)
}

export function discardBackup() {
  try {
    localStorage.removeItem(E.backupKey)
  } catch {
    // 忽略
  }
  patch({ backup: null })
}
