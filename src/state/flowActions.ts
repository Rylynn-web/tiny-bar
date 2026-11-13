import { sceneConfig } from '../config/sceneConfig'
import type { Seat } from '../config/seatConfig'
import { roomClient } from '../net/RoomClient'
import { track } from '../net/track'
import { unlockAudio } from './audio'
import { getFlow, goTo, patchFlow, resetFlow } from './flow'
import { closePanel, openPanel } from './panels'
import { poseTiming } from '../config/poses'
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

/** 坐到指定的座位上；座位被占了或房间满了返回 false */
export function takeSeat(seatId: string): boolean {
  const phase = getFlow().phase
  if (phase !== 'seating' && phase !== 'seated') return false
  const g = getGuests()
  if (g[seatId] && !g[seatId].self) return false
  if (!g[seatId] && Object.keys(g).length >= MAX_GUESTS) return false
  roomClient.sit(seatId)
  patchFlow({ moving: false })
  if (phase === 'seating') goTo('seated')
  return true
}

/** Move：换座位。空座位重新发绿光，点一个就换过去（饮品、小食跟着走） */
export function startMove() {
  if (getFlow().phase !== 'seated') return
  closePanel()
  patchFlow({ moving: true })
  goTo('seating')
}

/** 不换了：回到原来的座位 */
export function cancelMove() {
  const f = getFlow()
  if (f.phase !== 'seating' || !f.moving) return
  patchFlow({ moving: false })
  goTo('seated')
}

/** 随机挑一个空座位坐下（只给 ?debug 用） */
export function takeRandomSeat(seats: Seat[]): boolean {
  const free = freeSeats(seats)
  if (!free.length) return false
  return takeSeat(free[Math.floor(Math.random() * free.length)].id)
}

/** 走到门口要多久（起身 + 走路 + 缩小消失），离开阶段等这么久再出小票 / 结束画面 */
const walkSeconds = () => poseTiming.walk.standUp + poseTiming.walk.duration + poseTiming.walk.vanish

/**
 * 离开：小人起身走向门口消失 → 要小票就出小票，不要就直接到结束画面。
 * 门和角落的门形图标都先打开确认框（requestLeave），确认后才走到这里
 */
export function leaveBar(withReceipt: boolean) {
  const { phase, seatId } = getFlow()
  if (phase !== 'seated' && phase !== 'seating') return
  closePanel()
  patchFlow({ leftSeatId: seatId, withReceipt })
  roomClient.leave()
  goTo('leaving')
  after(walkSeconds(), () => {
    if (!withReceipt) {
      endSession(false)
      return
    }
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

/** 打开离开确认框（门 / 角落的门形图标） */
export function requestLeave() {
  if (getFlow().phase !== 'seated') return
  openPanel('leave')
}

/** 进入结束画面 */
function endSession(withReceipt: boolean) {
  if (goTo('ended')) track('session_end', { withReceipt })
}

/** 小票上的 Done */
export function closeReceipt() {
  endSession(true)
}

/** 结束画面的 Step back inside：直接重新进店，拿新称号，会话记录从零开始 */
export function stepBackInside() {
  if (getFlow().phase !== 'ended') return
  if (timer) clearTimeout(timer)
  timer = null
  unlockAudio()
  patchFlow({ title: null, selfId: null, seatId: null, leftSeatId: null, withReceipt: false, moving: false })
  startSession()
  track('step_inside', { again: true })
  goTo('entering')
  roomClient.join()
  after(F.enteringSeconds, () => goTo('seating'))
}

/** 回到开始画面（?debug 用） */
export function comeBackIn() {
  if (timer) clearTimeout(timer)
  timer = null
  resetFlow()
  track('entry_shown')
}
