import type { GuestSnapshot, ServerMessage } from './protocol'
import { getFlow, patchFlow } from '../state/flow'
import { getGuests, removeGuestById, replaceGuests, type Guest, type Guests } from '../state/guests'
import { setNowPlaying } from '../state/nowPlaying'
import { logSeat, logTitle } from '../state/sessionLog'

// 把服务器发来的消息写进前端状态。本地假实现和之后的真网络层都调用这一个函数，
// 所以 UI 只需要读状态（flow / guests / nowPlaying / sessionLog），不用管消息从哪来。

function toGuest(s: GuestSnapshot, selfId: string | null): Guest {
  return { id: s.id, title: s.title, state: s.state, drink: s.drink, food: s.food, emote: s.emote, seed: s.seed, self: s.id === selfId }
}

/** 按 id 放进 / 挪到对应座位（没坐下就从座位上拿掉） */
function upsert(g: Guests, s: GuestSnapshot, selfId: string | null): Guests {
  const next: Guests = {}
  for (const [seatId, x] of Object.entries(g)) if (x.id !== s.id) next[seatId] = x
  if (s.seatId) next[s.seatId] = toGuest(s, selfId)
  return next
}

export function applyServerMessage(msg: ServerMessage) {
  switch (msg.type) {
    case 'welcome': {
      patchFlow({ selfId: msg.you.id, title: msg.you.title, seatId: null })
      logTitle(msg.you.title)
      // 房间快照：保留本地已有的（开发环境的假客人），再放进服务器给的
      let g = getGuests()
      for (const s of msg.guests) g = upsert(g, s, msg.you.id)
      replaceGuests(g)
      setNowPlaying(msg.nowPlaying)
      break
    }
    case 'guestUpdated': {
      const { selfId, seatId } = getFlow()
      replaceGuests(upsert(getGuests(), msg.guest, selfId))
      if (msg.guest.id === selfId && msg.guest.seatId !== seatId) {
        patchFlow({ seatId: msg.guest.seatId })
        if (msg.guest.seatId) logSeat(msg.guest.seatId)
      }
      break
    }
    case 'guestLeft':
      removeGuestById(msg.id)
      if (msg.id === getFlow().selfId) patchFlow({ seatId: null })
      break
    case 'nowPlaying':
      setNowPlaying(msg.track)
      break
    case 'orderReady':
      // 桌上的显示已经跟着 guestUpdated 的 drink / food 走；这里留给之后的提示界面
      break
    case 'error':
      console.warn('[room]', msg.reason)
      break
  }
}
