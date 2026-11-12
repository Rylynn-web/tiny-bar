import { sceneConfig } from '../config/sceneConfig'
import type { Seat } from '../config/seatConfig'
import { roomClient } from '../net/RoomClient'
import { track } from '../net/track'
import { unlockAudio } from './audio'
import { getFlow, goTo, resetFlow } from './flow'
import { getGuests, MAX_GUESTS } from './guests'
import { getSessionLog, startSession } from './sessionLog'

// 流程里的几个动作：界面（和 ?debug）只调这些，阶段切换、埋点、会话记录、房间消息都在这里串起来。

const F = sceneConfig.flow
let timer: ReturnType<typeof setTimeout> | null = null
function after(seconds: number, fn: () => void) {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    fn()
  }, seconds * 1000)
}

/** 点 "Step inside"：解锁音频（必须在点击回调里同步调用）→ 进店 → 门口站一会儿 → 选座 */
export function stepInside() {
  if (getFlow().phase !== 'entry') return
  unlockAudio()
  startSession()
  track('step_inside')
  goTo('entering')
  roomClient.join()
  after(F.enteringSeconds, () => goTo('seating'))
}

/** 空着的座位（自己坐着的不算空） */
export function freeSeats(seats: Seat[]) {
  const g = getGuests()
  return seats.filter((s) => !g[s.id])
}

/** 坐下：不指定就随机挑一个空座位。坐满了返回 false */
export function takeSeat(seats: Seat[], seatId?: string): boolean {
  const phase = getFlow().phase
  if (phase !== 'seating' && phase !== 'seated') return false
  const g = getGuests()
  if (!seatId) {
    const free = freeSeats(seats)
    if (!free.length || Object.keys(g).length >= MAX_GUESTS) return false
    seatId = free[Math.floor(Math.random() * free.length)].id
  }
  roomClient.sit(seatId)
  if (phase === 'seating') goTo('seated')
  return true
}

/** 起身离开 → 走回门口 → 出小票 */
export function leaveBar() {
  const phase = getFlow().phase
  if (phase !== 'seated' && phase !== 'seating') return
  roomClient.leave()
  goTo('leaving')
  after(F.leavingSeconds, () => {
    if (goTo('receipt')) {
      const log = getSessionLog()
      track('receipt_shown', {
        minutes: log.enteredAt && log.leftAt ? Math.round((log.leftAt - log.enteredAt) / 60000) : 0,
        seats: log.seats.length,
        orders: log.orders.length,
        songs: log.songs.length,
        goodChats: log.goodChats.length,
      })
    }
  })
}

export function closeReceipt() {
  goTo('ended')
}

/** 结束后重新进店（回到开始画面） */
export function comeBackIn() {
  if (timer) clearTimeout(timer)
  timer = null
  resetFlow()
  track('entry_shown')
}
