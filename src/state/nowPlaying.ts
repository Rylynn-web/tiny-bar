import { useSyncExternalStore } from 'react'
import type { Track } from '../net/protocol'

// 店里正在放的歌（房间广播，所有人一样）

let current: Track | null = null
const listeners = new Set<() => void>()

export function getNowPlaying() {
  return current
}

export function setNowPlaying(track: Track | null) {
  current = track
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
