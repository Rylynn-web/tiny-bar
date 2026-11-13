import { useSyncExternalStore } from 'react'

// 会话记录：这一次进店发生了什么，给离店时的小票用。时间一律是毫秒时间戳（Date.now()）。

export type SessionLog = {
  /** 进店时间（点 "Step inside" 的那一刻） */
  enteredAt: number | null
  leftAt: number | null
  title: string | null
  /** 坐过的座位（按时间先后） */
  seats: { seatId: string; at: number }[]
  /** 点过的东西 */
  orders: { item: string; at: number }[]
  /** 点过的歌 */
  songs: { trackId: string; title: string; artist: string; at: number }[]
  /** 和谁"聊得开心"（对方的称号，同一个人只记一次） */
  goodChats: { title: string; at: number }[]
}

const empty = (): SessionLog => ({ enteredAt: null, leftAt: null, title: null, seats: [], orders: [], songs: [], goodChats: [] })

let log: SessionLog = empty()
const listeners = new Set<() => void>()

function emit(next: SessionLog) {
  log = next
  listeners.forEach((l) => l())
}

export function getSessionLog(): SessionLog {
  return log
}

export function useSessionLog() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => log,
  )
}

/** 新的一次进店：清空上一次的记录 */
export function startSession(at = Date.now()) {
  emit({ ...empty(), enteredAt: at })
}

export function logTitle(title: string) {
  emit({ ...log, title })
}

export function logSeat(seatId: string, at = Date.now()) {
  emit({ ...log, seats: [...log.seats, { seatId, at }] })
}

export function logOrder(item: string, at = Date.now()) {
  emit({ ...log, orders: [...log.orders, { item, at }] })
}

export function logSong(trackId: string, title: string, artist: string, at = Date.now()) {
  emit({ ...log, songs: [...log.songs, { trackId, title, artist, at }] })
}

/** 记一次"聊得开心"；同一个人已经记过就不再记（返回是否新记了一条） */
export function logGoodChat(title: string, at = Date.now()): boolean {
  if (log.goodChats.some((c) => c.title === title)) return false
  emit({ ...log, goodChats: [...log.goodChats, { title, at }] })
  return true
}

export function logLeft(at = Date.now()) {
  emit({ ...log, leftAt: at })
}
