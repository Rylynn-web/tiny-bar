import { useEffect, useState, type ReactNode } from 'react'
import { emoteTiming, persistentEmotes, temporaryEmotes, type Expression } from '../config/expressions'
import { roomClient } from '../net/RoomClient'
import { findSelfSeat, useGuests } from '../state/guests'
import { copy } from './copy'

/** 按钮上的小眼睛（和小人脸上的表情一样的画法，24 × 24） */
const faces: Record<Expression, ReactNode> = {
  default: (
    <>
      <ellipse cx="8" cy="12" rx="1.8" ry="2.8" fill="currentColor" stroke="none" />
      <ellipse cx="16" cy="12" rx="1.8" ry="2.8" fill="currentColor" stroke="none" />
    </>
  ),
  happy: <path d="M5.5 13.5Q8 8.5 10.5 13.5M13.5 13.5Q16 8.5 18.5 13.5" />,
  squint: <path d="M5.5 9.5 9.5 12l-4 2.5M18.5 9.5 14.5 12l4 2.5" />,
  surprised: (
    <>
      <circle cx="8" cy="12" r="2.8" />
      <circle cx="16" cy="12" r="2.8" />
      <circle cx="8" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  focus: <path d="M5.5 12.5h5M13.5 12.5h5" />,
}

const order: Expression[] = [...temporaryEmotes, ...persistentEmotes]
const RING = 2 * Math.PI * 20

/**
 * 表情按钮：临时表情（^ ^、> <、⊙ ⊙）点了显示 3 秒后恢复，按钮外圈有 3 秒的倒计时进度；
 * 持续表情（● ●、- -）选中后一直保持，直到换别的（再点一次取消，回到按状态自动）
 */
export function EmoteBar() {
  const guests = useGuests()
  const seatId = findSelfSeat(guests)
  const me = seatId ? guests[seatId] : null
  const flash = me?.flash && me.flash.until > Date.now() ? me.flash : null
  // 临时表情到期时刷新一下（去掉倒计时圈）
  const [, tick] = useState(0)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => tick((n) => n + 1), flash.until - Date.now() + 30)
    return () => clearTimeout(id)
  }, [flash])

  return (
    <div className="emote-group" aria-label={copy.emotes.label}>
      {order.map((e) => {
        const temporary = temporaryEmotes.includes(e)
        const counting = temporary && flash?.expression === e
        const kept = !temporary && me?.emote === e
        return (
          <button
            key={e}
            type="button"
            className={`bar-button emote-button ${kept ? 'active' : ''} ${counting ? 'counting' : ''}`}
            aria-label={copy.emotes.names[e]}
            aria-pressed={temporary ? undefined : kept}
            disabled={!me}
            onClick={() => {
              if (temporary) roomClient.setEmote(e, { temporary: true })
              else roomClient.setEmote(kept ? null : e)
            }}
          >
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {faces[e]}
            </svg>
            {counting && flash && (
              // 倒计时圈：按剩余时间从整圈走到零（key 换了就从头开始）
              <svg key={flash.until} className="emote-ring" viewBox="0 0 44 44" aria-hidden="true">
                <circle
                  cx="22"
                  cy="22"
                  r="20"
                  strokeDasharray={RING}
                  style={{
                    animationDuration: `${emoteTiming.temporarySeconds}s`,
                    animationDelay: `${-(emoteTiming.temporarySeconds - (flash.until - Date.now()) / 1000)}s`,
                  }}
                />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
