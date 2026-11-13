import { useSyncExternalStore } from 'react'
import type { NowPlaying } from '../net/protocol'

// 店里正在放的歌（房间广播，所有人一样）：哪一首、在放还是暂停、是谁放的

let current: NowPlaying | null = null
const listeners = new Set<() => void>()

export function getNowPlaying() {
  return current
}

export function setNowPlaying(next: NowPlaying | null) {
  current = next
  listeners.forEach((l) => l())
}

export function subscribeNowPlaying(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useNowPlaying() {
  return useSyncExternalStore(subscribeNowPlaying, () => current)
}
