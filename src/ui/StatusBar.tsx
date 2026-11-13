import { useEffect, useState, type ReactNode } from 'react'
import { useSeats } from '../config/seatConfig'
import { guestStates, type GuestState } from '../config/poses'
import { roomClient } from '../net/RoomClient'
import { findSelfSeat, hasNeighbor, useGuests } from '../state/guests'
import { copy } from './copy'

/** 每个状态一个简单的线条图标（24 × 24） */
const icons: Record<GuestState, ReactNode> = {
  // 一杯咖啡
  idle: (
    <>
      <path d="M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5Z" />
      <path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H16" />
      <path d="M8.5 4.5c0 1.2 1 1.2 1 2.4M12 4.5c0 1.2 1 1.2 1 2.4" />
    </>
  ),
  // 一本打开的书
  reading: (
    <>
      <path d="M12 6.5C10 5 7 4.8 4 5.5v12c3-.7 6-.5 8 1 2-1.5 5-1.7 8-1v-12c-3-.7-6-.5-8 1Z" />
      <path d="M12 6.5v12" />
    </>
  ),
  // 笔记本电脑
  laptop: (
    <>
      <rect x="5" y="5.5" width="14" height="9.5" rx="1.5" />
      <path d="M3 18.5h18" />
    </>
  ),
  // 两个对话气泡
  talking: (
    <>
      <path d="M4 6.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H9l-3 2.5v-2.5a2 2 0 0 1-2-2v-4Z" />
      <path d="M17 9.5h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2v2.5l-3-2.5h-3a2 2 0 0 1-2-2v-.5" />
    </>
  ),
}

/**
 * 坐下后自己选状态：Idle / Reading / Working / Chatting，当前的高亮。
 * Chatting 要邻座有人才能选：没人时按钮变灰，但点了会提示 "Chatting needs a neighbor"
 */
export function StatusBar() {
  const seats = useSeats()
  const guests = useGuests()
  const seatId = findSelfSeat(guests)
  const seat = seats.find((s) => s.id === seatId)
  const me = seatId ? guests[seatId] : null
  const canChat = !!seat && hasNeighbor(seat, guests)
  // 选了交谈但邻座的人走了：实际按静坐显示
  const current = me?.state === 'talking' && !canChat ? 'idle' : me?.state
  const [hint, setHint] = useState(false)
  useEffect(() => {
    if (!hint) return
    const id = setTimeout(() => setHint(false), 2000)
    return () => clearTimeout(id)
  }, [hint])

  return (
    <div className="status-group" role="radiogroup" aria-label={copy.status.label}>
      {guestStates.map((s) => {
        const locked = s === 'talking' && !canChat
        const active = current === s
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={locked || !me}
            className={`bar-button status-button ${active ? 'active' : ''} ${locked ? 'locked' : ''}`}
            onClick={() => {
              if (!me) return
              if (locked) return setHint(true)
              if (!active) roomClient.setStatus(s)
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {icons[s]}
            </svg>
            <span>{copy.status.names[s]}</span>
          </button>
        )
      })}
      {hint && (
        <span className="bar-hint" role="status">
          {copy.status.needsNeighbor}
        </span>
      )}
    </div>
  )
}
