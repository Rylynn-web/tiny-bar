import { useEffect } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { track } from '../net/track'
import { getFlow } from './flow'
import { choosePartner, effectiveState, getGuests } from './guests'
import { logGoodChat } from './sessionLog'

// "聊得开心"：自己坐着、在交谈，和同一个交谈对象连续聊满 flow.goodChatSeconds 秒，
// 就把对方的称号记进会话记录（同一个人只记一次）。换了对象或停下来就重新计时。

const TICK = 1

export function useGoodChatWatcher() {
  const seats = useSeats()
  useEffect(() => {
    const byId = new Map(seats.map((s) => [s.id, s]))
    let partnerTitle: string | null = null
    let seconds = 0
    const id = setInterval(() => {
      const { phase, seatId } = getFlow()
      const guests = getGuests()
      const seat = seatId ? byId.get(seatId) : undefined
      const me = seatId ? guests[seatId] : undefined
      let current: string | null = null
      if (phase === 'seated' && seat && me && effectiveState(seat, me, guests) === 'talking') {
        const p = choosePartner(seat, byId, guests)
        current = (p && guests[p.id]?.title) || null
      }
      if (!current || current !== partnerTitle) {
        partnerTitle = current
        seconds = 0
        return
      }
      seconds += TICK
      if (seconds >= sceneConfig.flow.goodChatSeconds && logGoodChat(current)) track('good_chat', { with: current })
    }, TICK * 1000)
    return () => clearInterval(id)
  }, [seats])
}
