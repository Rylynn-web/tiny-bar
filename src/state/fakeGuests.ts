import type { Seat } from '../config/seatConfig'
import { guestStates, type GuestState } from '../config/poses'
import { generateTitle } from '../config/titles'
import { MAX_GUESTS, getGuests, hasNeighbor, newSeed, replaceGuests, type Guest, type Guests } from './guests'

// 假客人：只给开发环境 ?debug 测试有人的座位用（随机称号、随机状态）。
// 只被 src/ui/GuestDebug.tsx 引用，而 GuestDebug 只在 import.meta.env.DEV 时加载，生产构建里没有这个文件。

let counter = 0

/** 随机挑一个状态（交谈只在邻座有人时才会被选中） */
function randomState(seat: Seat, g: Guests): GuestState {
  const pool = guestStates.filter((s) => s !== 'talking' || hasNeighbor(seat, g))
  return pool[Math.floor(Math.random() * pool.length)]
}

function takenTitles(g: Guests, extra: string[] = []) {
  return [...Object.values(g).map((x) => x.title ?? ''), ...extra]
}

function makeFake(g: Guests, selfTitle: string | null): Guest {
  return {
    id: `fake-${++counter}`,
    title: generateTitle(takenTitles(g, selfTitle ? [selfTitle] : [])),
    state: 'idle',
    drink: Math.random() < 0.5,
    seed: newSeed(),
    fake: true,
  }
}

/** 在一个空座位上生成一个假客人（自己坐着的座位不动）；state 不给就随机 */
export function addFakeGuest(seat: Seat, selfTitle: string | null, state?: GuestState) {
  const g = getGuests()
  if (g[seat.id]?.self) return
  const next = { ...g }
  const total = Object.keys(next).length
  if (!next[seat.id] && total >= MAX_GUESTS) return
  next[seat.id] = { ...makeFake(next, selfTitle), state: 'idle' }
  next[seat.id].state = state ?? randomState(seat, next)
  replaceGuests(next)
}

/** 去掉一个座位上的假客人 */
export function removeFakeGuest(seatId: string) {
  const g = getGuests()
  if (!g[seatId]?.fake) return
  const next = { ...g }
  delete next[seatId]
  replaceGuests(next)
}

/** 所有假客人随机换一个状态、随机点不点饮料 */
export function randomizeFakes(seats: Seat[]) {
  const next: Guests = {}
  for (const [id, x] of Object.entries(getGuests())) next[id] = { ...x }
  for (const seat of seats) {
    const g = next[seat.id]
    if (!g?.fake) continue
    g.state = randomState(seat, next)
    g.drink = Math.random() < 0.5
  }
  replaceGuests(next)
}

/** 空座位全部坐上假客人（总数不超过 8，含自己） */
export function fillFakes(seats: Seat[], selfTitle: string | null) {
  const next: Guests = { ...getGuests() }
  const empty = seats.filter((s) => !next[s.id]).sort(() => Math.random() - 0.5)
  for (const seat of empty) {
    if (Object.keys(next).length >= MAX_GUESTS) break
    next[seat.id] = makeFake(next, selfTitle)
  }
  for (const seat of empty) if (next[seat.id]?.fake) next[seat.id].state = randomState(seat, next)
  replaceGuests(next)
}

/** 清掉所有假客人（自己留着） */
export function clearFakes() {
  const next: Guests = {}
  for (const [id, x] of Object.entries(getGuests())) if (!x.fake) next[id] = x
  replaceGuests(next)
}
