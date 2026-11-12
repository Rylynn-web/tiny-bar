import { useSyncExternalStore } from 'react'
import { track } from '../net/track'

// 单人流程的状态机：所有界面都根据当前阶段显示。
//   entry     开始画面（还没进店，等点 "Step inside"）
//   entering  进店：门口站着，小黑板写出称号
//   seating   选座位
//   seated    坐着（阅读 / 办公 / 交谈 / 点单 / 点歌）
//   leaving   起身离开，走回门口
//   receipt   小票
//   ended     结束

export type Phase = 'entry' | 'entering' | 'seating' | 'seated' | 'leaving' | 'receipt' | 'ended'
export const phases: Phase[] = ['entry', 'entering', 'seating', 'seated', 'leaving', 'receipt', 'ended']

/** 每个阶段之后允许去哪些阶段（只能往前走；ended 之后可以重新进店） */
const allowed: Record<Phase, Phase[]> = {
  entry: ['entering'],
  entering: ['seating'],
  seating: ['seated', 'leaving'],
  seated: ['leaving'],
  leaving: ['receipt'],
  receipt: ['ended'],
  ended: ['entry'],
}

export type FlowState = {
  phase: Phase
  /** 自己的称号（进店时由房间分配） */
  title: string | null
  /** 自己的客人 id（进店时由房间分配） */
  selfId: string | null
  /** 自己坐在哪个座位（没坐下为 null） */
  seatId: string | null
}

let state: FlowState = { phase: 'entry', title: null, selfId: null, seatId: null }
const listeners = new Set<() => void>()

function emit(next: FlowState) {
  state = next
  listeners.forEach((l) => l())
}

export function getFlow() {
  return state
}

export function useFlow() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function canGo(to: Phase, from: Phase = state.phase) {
  return allowed[from].includes(to)
}

/** 切换阶段；不合法的跳转直接忽略（返回 false）。force 只给 ?debug 用 */
export function goTo(to: Phase, force = false): boolean {
  const from = state.phase
  if (from === to) return false
  if (!force && !canGo(to, from)) {
    if (import.meta.env.DEV) console.warn(`[flow] 不能从 ${from} 到 ${to}`)
    return false
  }
  emit({ ...state, phase: to })
  track('phase_changed', { from, to })
  return true
}

/** 更新自己的身份 / 座位（由 RoomClient 收到服务器消息后调用） */
export function patchFlow(patch: Partial<Omit<FlowState, 'phase'>>) {
  emit({ ...state, ...patch })
}

/** 回到开始画面（ended 之后重新进店，或 ?debug 重置） */
export function resetFlow() {
  emit({ phase: 'entry', title: null, selfId: null, seatId: null })
}
