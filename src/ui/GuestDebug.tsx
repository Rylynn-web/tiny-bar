import { useEffect } from 'react'
import { button, folder, useControls } from 'leva'
import { useSeats } from '../config/seatConfig'
import { guestStateLabels, guestStates, type GuestState } from '../config/poses'
import { clearGuests, fillGuests, getGuests, hasNeighbor, randomizeAll, setGuest, setGuestEmote, useGuests } from '../state/guests'
import { expressionLabels, expressions, type Expression } from '../config/expressions'

// ?debug 面板「座位」：给每个座位单独设状态、是否点了饮料；全部随机 / 坐满 8 人 / 清空

type Choice = GuestState | 'none'
type EmoteChoice = Expression | 'auto'
const emoteOptions: Record<string, EmoteChoice> = {
  自动: 'auto',
  ...Object.fromEntries(expressions.map((e) => [expressionLabels[e], e])),
}
const options: Record<string, Choice> = {
  空着: 'none',
  ...Object.fromEntries(guestStates.map((s) => [guestStateLabels[s], s])),
}

export function GuestDebug() {
  const seats = useSeats()
  const guests = useGuests()

  const [, set] = useControls(
    () => ({
      座位: folder(
        {
          全部随机: button(() => randomizeAll(seats)),
          坐满8人: button(() => fillGuests(seats)),
          清空: button(() => clearGuests()),
          ...Object.fromEntries(
            seats.flatMap((seat) => [
              [
                `${seat.id}·状态`,
                {
                  value: (getGuests()[seat.id]?.state ?? 'none') as Choice,
                  options,
                  label: seat.id,
                  onChange: (v: Choice, _path: string, ctx: { initial: boolean; fromPanel: boolean }) => {
                    if (ctx.initial || !ctx.fromPanel) return
                    setGuest(seat.id, v === 'none' ? null : v)
                  },
                },
              ],
              [
                `${seat.id}·表情`,
                {
                  value: (getGuests()[seat.id]?.emote ?? 'auto') as EmoteChoice,
                  options: emoteOptions,
                  label: '  表情',
                  onChange: (v: EmoteChoice, _path: string, ctx: { initial: boolean; fromPanel: boolean }) => {
                    if (ctx.initial || !ctx.fromPanel) return
                    setGuestEmote(seat.id, v === 'auto' ? null : v)
                  },
                },
              ],
              [
                `${seat.id}·饮料`,
                {
                  value: getGuests()[seat.id]?.drink ?? false,
                  label: '  点了饮料',
                  onChange: (v: boolean, _path: string, ctx: { initial: boolean; fromPanel: boolean }) => {
                    if (ctx.initial || !ctx.fromPanel) return
                    const g = getGuests()[seat.id]
                    if (g) setGuest(seat.id, g.state, v)
                  },
                },
              ],
            ]),
          ),
        },
        { collapsed: true },
      ),
    }),
    [seats],
  )

  // 按钮改了座位以后，把面板上的值同步过来；选了交谈但邻座没人时，面板上照样显示（实际按静坐）
  useEffect(() => {
    const values: Record<string, Choice | EmoteChoice | boolean> = {}
    for (const seat of seats) {
      const g = guests[seat.id]
      values[`${seat.id}·状态`] = g?.state ?? 'none'
      values[`${seat.id}·饮料`] = g?.drink ?? false
      values[`${seat.id}·表情`] = g?.emote ?? 'auto'
    }
    set(values as never)
    const lonely = seats.filter((s) => guests[s.id]?.state === 'talking' && !hasNeighbor(s, guests)).map((s) => s.id)
    if (lonely.length) console.info('[座位] 邻座没人，交谈按静坐处理：', lonely)
  }, [guests, seats, set])

  return null
}
