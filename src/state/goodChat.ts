import { useEffect } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { track } from '../net/track'
import { getFlow } from './flow'
import { choosePartner, effectiveState, getGuests } from './guests'
import { logGoodChat } from './sessionLog'

// "聊得开心"：自己和交谈对象（邻座）都处于 Chatting 状态、连续超过 flow.goodChatSeconds 秒，
// 就把对方的称号记进会话记录（同一个人只记一次）。任何一方停下、或换了对象，就重新计时。

const TICK = 1

export function useGoodChatWatcher() {
  const seats = useSeats()
  useEffect(() => {
    const byId = new Map(seats.map((s) => [s.id, s]))
    let partnerTitle: string | null = null
    let since = 0
    const id = setInterval(() => {
      const { phase, seatId } = getFlow()
      const guests = getGuests()
      const seat = seatId ? byId.get(seatId) : undefined
      const me = seatId ? guests[seatId] : undefined
      let current: string | null = null
      if (phase === 'seated' && seat && me && effectiveState(seat, me, guests) === 'talking') {
        const p = choosePartner(seat, byId, guests)
        const other = p ? guests[p.id] : undefined
        // 对方也要在交谈（对方的交谈对象不一定是自己，但两人都在聊才算）
        if (p && other && effectiveState(p, other, guests) === 'talking') current = other.title || null
      }
      if (!current || current !== partnerTitle) {
        partnerTitle = current
        since = Date.now()
        return
      }
      // 按真实时间算（页面在后台时定时器会被放慢）
      if ((Date.now() - since) / 1000 > sceneConfig.flow.goodChatSeconds && logGoodChat(current)) track('good_chat', { with: current })
    }, TICK * 1000)
    return () => clearInterval(id)
  }, [seats])
}
