import { useEffect, useRef, useState, type ReactNode } from 'react'
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

/** 收起时的按钮图标：一张线条笑脸（矢量图，不用 emoji 字符，手机上不会被换成系统 emoji） */
const smiley = (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="9" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="10" r="1.1" fill="currentColor" stroke="none" />
    <path d="M8.2 14.2a4.5 4.5 0 0 0 7.6 0" />
  </svg>
)

const order: Expression[] = [...temporaryEmotes, ...persistentEmotes]
const RING = 2 * Math.PI * 20

/** 能悬停的设备（电脑鼠标）：悬停展开；手机（触屏）：点按展开 */
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** 临时表情的倒计时圈：按剩余时间从整圈走到零（key 换了就从头开始） */
function Countdown({ until }: { until: number }) {
  return (
    <svg key={until} className="emote-ring" viewBox="0 0 44 44" aria-hidden="true">
      <circle
        cx="22"
        cy="22"
        r="20"
        strokeDasharray={RING}
        style={{
          animationDuration: `${emoteTiming.temporarySeconds}s`,
          animationDelay: `${-(emoteTiming.temporarySeconds - (until - Date.now()) / 1000)}s`,
        }}
      />
    </svg>
  )
}

/**
 * 表情：底部栏上只有一个笑脸按钮，手机点按 / 电脑悬停展开一排表情。
 * 临时表情（^ ^、> <、⊙ ⊙）显示 3 秒后恢复，倒计时圈显示在笑脸按钮和那个表情上；
 * 持续表情（● ●、- -）选中后一直保持，直到换别的（再点一次取消，回到按状态自动）
 */
export function EmoteBar() {
  const guests = useGuests()
  const seatId = findSelfSeat(guests)
  const me = seatId ? guests[seatId] : null
  const flash = me?.flash && me.flash.until > Date.now() ? me.flash : null
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 临时表情到期时刷新一下（去掉倒计时圈）
  const [, tick] = useState(0)
  useEffect(() => {
    if (!flash) return
    const id = setTimeout(() => tick((n) => n + 1), flash.until - Date.now() + 30)
    return () => clearTimeout(id)
  }, [flash])

  // 点外面收起（手机上展开后）
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [open])

  // 电脑：悬停展开，移开后稍等一下再收起（鼠标从按钮移到列表上不会闪）
  const hoverOpen = () => {
    if (!canHover()) return
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hoverClose = () => {
    if (!canHover()) return
    closeTimer.current = setTimeout(() => setOpen(false), 200)
  }
  useEffect(() => () => void (closeTimer.current && clearTimeout(closeTimer.current)), [])

  const pick = (e: Expression) => {
    const temporary = temporaryEmotes.includes(e)
    if (temporary) roomClient.setEmote(e, { temporary: true })
    else roomClient.setEmote(me?.emote === e ? null : e)
    // 手机上选完就收起；电脑上悬停着就继续开着
    if (!canHover()) setOpen(false)
  }

  return (
    <div className="emote-picker" ref={root} onMouseEnter={hoverOpen} onMouseLeave={hoverClose}>
      <button
        type="button"
        className={`bar-button emote-toggle ${open ? 'open' : ''} ${me?.emote ? 'kept' : ''}`}
        aria-label={copy.emotes.label}
        aria-expanded={open}
        disabled={!me}
        onClick={() => setOpen((o) => !o)}
      >
        {smiley}
        {flash && <Countdown until={flash.until} />}
      </button>
      {open && (
        <div className="emote-list" role="menu" aria-label={copy.emotes.label}>
          {order.map((e) => {
            const temporary = temporaryEmotes.includes(e)
            const counting = temporary && flash?.expression === e
            const kept = !temporary && me?.emote === e
            return (
              <button
                key={e}
                type="button"
                role="menuitem"
                className={`bar-button emote-button ${kept ? 'active' : ''} ${counting ? 'counting' : ''}`}
                aria-label={copy.emotes.names[e]}
                aria-pressed={temporary ? undefined : kept}
                onClick={() => pick(e)}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {faces[e]}
                </svg>
                {counting && flash && <Countdown until={flash.until} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
