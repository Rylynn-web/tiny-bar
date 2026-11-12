import { useSyncExternalStore } from 'react'
import type { Seat } from '../config/seatConfig'
import type { GuestState } from '../config/poses'
import type { Expression } from '../config/expressions'
import type { MenuId } from '../config/menu'

// 座位上的小人：每个座位坐没坐人、在做什么、点没点饮料、称号，以及每人自己的随机种子（动作相位错开）。
// 只由 RoomClient 收到的消息改写（src/net/applyServerMessage.ts）；开发环境 ?debug 还能生成假客人（src/state/fakeGuests.ts）。

export const MAX_GUESTS = 8

/**
 * id：客人 id（房间分配）；title：称号；drink / food：桌上的饮品和小食（各最多一份）；
 * emote：手动指定的表情（RoomClient.setEmote），没有就按自动规则；
 * self：是不是自己；fake：?debug 生成的假客人
 */
export type Guest = {
  id?: string
  title?: string
  state: GuestState
  drink: MenuId | null
  food: MenuId | null
  seed: number
  emote?: Expression | null
  self?: boolean
  fake?: boolean
}
export type Guests = Record<string, Guest>

let guests: Guests = {}
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

export const newSeed = () => 1 + Math.floor(Math.random() * 1e6)

/** 整体替换（RoomClient / 假客人用） */
export function replaceGuests(next: Guests) {
  emit(next)
}

/** 在座位上放一个客人（覆盖原来的） */
export function putGuest(seatId: string, guest: Guest) {
  emit({ ...guests, [seatId]: guest })
}

/** 按客人 id 移除（不管坐在哪） */
export function removeGuestById(id: string) {
  const next = { ...guests }
  for (const [seatId, g] of Object.entries(next)) if (g.id === id) delete next[seatId]
  emit(next)
}

/** 换掉一个座位上的饮品 / 小食（?debug 用；正常点单走 RoomClient.order） */
export function setGuestOrder(seatId: string, kind: 'drink' | 'food', id: MenuId | null) {
  const g = guests[seatId]
  if (!g) return
  emit({ ...guests, [seatId]: { ...g, [kind]: id } })
}

/** 自己坐在哪（没坐下为 null） */
export function findSelfSeat(g: Guests = guests): string | null {
  for (const [seatId, x] of Object.entries(g)) if (x.self) return seatId
  return null
}

/** 设置一个座位：state 为 null 表示让座位空着 */
export function setGuest(seatId: string, state: GuestState | null) {
  const next = { ...guests }
  if (!state) delete next[seatId]
  else {
    const prev = next[seatId]
    next[seatId] = { ...prev, state, drink: prev?.drink ?? null, food: prev?.food ?? null, seed: prev?.seed ?? newSeed(), emote: prev?.emote ?? null }
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
