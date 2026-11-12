import { useSyncExternalStore } from 'react'
import type { Seat } from '../config/seatConfig'
import { guestStates, type GuestState } from '../config/poses'
import type { Expression } from '../config/expressions'

// 座位上的小人：每个座位坐没坐人、在做什么、点没点饮料，以及每人自己的随机种子（动作相位错开）。
// P3 联网前是本地假数据；?debug 面板可以逐个设置、全部随机、坐满 8 人。

export const MAX_GUESTS = 8

/** emote：手动指定的表情（?debug / RoomClient.setEmote），没有就按自动规则 */
export type Guest = { state: GuestState; drink: boolean; seed: number; emote?: Expression | null }
export type Guests = Record<string, Guest>

let guests: Guests = { 'chair-a1': { state: 'idle', drink: false, seed: 1 } }
const listeners = new Set<() => void>()

function emit(next: Guests) {
  guests = next
  listeners.forEach((l) => l())
}

export function getGuests() {
  return guests
}

export function useGuests() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => guests,
  )
}

const newSeed = () => 1 + Math.floor(Math.random() * 1e6)

/** 设置一个座位：state 为 null 表示让座位空着 */
export function setGuest(seatId: string, state: GuestState | null, drink?: boolean) {
  const next = { ...guests }
  if (!state) delete next[seatId]
  else {
    const prev = next[seatId]
    next[seatId] = { state, drink: drink ?? prev?.drink ?? false, seed: prev?.seed ?? newSeed(), emote: prev?.emote ?? null }
  }
  emit(next)
}

/** 手动设一个座位的表情；null = 回到自动规则。座位上没人时不做事 */
export function setGuestEmote(seatId: string, emote: Expression | null) {
  const g = guests[seatId]
  if (!g) return
  emit({ ...guests, [seatId]: { ...g, emote } })
}

/** 邻座里有没有人：交谈只在有人可聊时可用 */
export function hasNeighbor(seat: Seat, g: Guests = guests) {
  return seat.neighbors.some((id) => !!g[id])
}

/**
 * 交谈对象：在有人坐的邻座里挑"最像同伴"的那个——
 * 同一件家具（沙发的两个位置）或同一张桌子（拼桌 / 一起来的朋友）最优先，其次同类座位（两个方凳），
 * 再其次是不用怎么转身就能面对的人（转向角越小越优先）
 */
export function choosePartner(seat: Seat, byId: Map<string, Seat>, g: Guests = guests): Seat | null {
  let best: Seat | null = null
  let bestScore = Infinity
  for (const id of seat.neighbors) {
    const other = byId.get(id)
    if (!other || !g[id]) continue
    const sameGroup = other.itemId === seat.itemId || (!!seat.deskItemId && other.deskItemId === seat.deskItemId)
    const sameType = other.type === seat.type
    // 在自己座位坐标里，对方在哪个方向（0 = 正前方）
    const dx = other.position[0] - seat.position[0]
    const dz = other.position[2] - seat.position[2]
    const c = Math.cos(-seat.rotationY)
    const s = Math.sin(-seat.rotationY)
    const turn = Math.abs(Math.atan2(dx * c + dz * s, -dx * s + dz * c))
    const score = (sameGroup ? 0 : sameType ? 10 : 20) + turn
    if (score < bestScore) {
      bestScore = score
      best = other
    }
  }
  return best
}

/** 当前真正生效的状态：选了交谈但邻座没人时退回静坐 */
export function effectiveState(seat: Seat, guest: Guest, g: Guests = guests): GuestState {
  return guest.state === 'talking' && !hasNeighbor(seat, g) ? 'idle' : guest.state
}

/** 随机挑一个状态（交谈只在邻座有人时才会被选中） */
function randomState(seat: Seat, g: Guests): GuestState {
  const pool = guestStates.filter((s) => s !== 'talking' || hasNeighbor(seat, g))
  return pool[Math.floor(Math.random() * pool.length)]
}

/** 已经坐着的人全部随机换一个状态、随机点不点饮料 */
export function randomizeAll(seats: Seat[]) {
  const next: Guests = {}
  for (const id of Object.keys(guests)) next[id] = { ...guests[id] }
  for (const seat of seats) {
    const g = next[seat.id]
    if (!g) continue
    g.state = randomState(seat, next)
    g.drink = Math.random() < 0.5
  }
  emit(next)
}

/** 坐满 8 人（座位多于 8 个时随机挑），每人随机状态 */
export function fillGuests(seats: Seat[]) {
  const pick = [...seats].sort(() => Math.random() - 0.5).slice(0, MAX_GUESTS)
  const next: Guests = {}
  for (const seat of pick) next[seat.id] = { state: 'idle', drink: false, seed: newSeed() }
  for (const seat of pick) {
    next[seat.id].state = randomState(seat, next)
    next[seat.id].drink = Math.random() < 0.5
  }
  emit(next)
}

export function clearGuests() {
  emit({})
}
