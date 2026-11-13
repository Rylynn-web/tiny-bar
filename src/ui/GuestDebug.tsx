import { useEffect } from 'react'
import { button, folder, useControls } from 'leva'
import { useSeats } from '../config/seatConfig'
import { guestStateLabels, guestStates, type GuestState } from '../config/poses'
import { getGuests, hasNeighbor, setGuest, setGuestEmote, setGuestFlash, setGuestOrder, useGuests } from '../state/guests'
import { menuItems, menuAtlasOrder, type MenuId } from '../config/menu'
import { copy } from './copy'
import { useSceneParams } from '../state/sceneParams'
import { addFakeGuest, clearFakes, fillFakes, randomizeFakes, removeFakeGuest, setFakeMenuTime } from '../state/fakeGuests'
import { getFlow } from '../state/flow'
import { FlowDebug } from './FlowDebug'
import { emoteTiming, expressionLabels, expressions, type Expression } from '../config/expressions'

// 开发环境 ?debug 面板「座位」：在任意座位生成假客人（随机称号、随机状态），单独设状态 / 表情 / 饮料；
// 全部随机 / 坐满 8 人 / 清空假客人。只在 import.meta.env.DEV 时加载，生产构建里没有假客人。

type Choice = GuestState | 'none'
type EmoteChoice = Expression | 'auto'
const emoteOptions: Record<string, EmoteChoice> = {
  自动: 'auto',
  ...Object.fromEntries(expressions.map((e) => [expressionLabels[e], e])),
}
type OrderChoice = MenuId | 'none'
const orderOptions = Object.fromEntries(
  (['drink', 'food'] as const).map((kind) => [
    kind,
    { 无: 'none', ...Object.fromEntries(menuAtlasOrder.filter((id) => menuItems[id].kind === kind).map((id) => [copy.menu.items[id], id])) },
  ]),
) as unknown as Record<'drink' | 'food', Record<string, OrderChoice>>
const options: Record<string, Choice> = {
  空着: 'none',
  ...Object.fromEntries(guestStates.map((s) => [guestStateLabels[s], s])),
}

export function GuestDebug() {
  const seats = useSeats()
  const guests = useGuests()
  // 假客人从当前时段的菜单里点
  setFakeMenuTime(useSceneParams().timeOfDay)

  const [, set] = useControls(
    () => ({
      座位: folder(
        {
          全部随机: button(() => randomizeFakes(seats)),
          坐满8人: button(() => fillFakes(seats, getFlow().title)),
          清空假客人: button(() => clearFakes()),
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
                    const g = getGuests()[seat.id]
                    if (v === 'none') {
                      if (g?.self) return
                      removeFakeGuest(seat.id)
                    } else if (!g) addFakeGuest(seat, getFlow().title, v)
                    else setGuest(seat.id, v)
                  },
                },
              ],
              [
                `${seat.id}·表情`,
                {
                  value: (getGuests()[seat.id]?.emote ?? 'auto') as EmoteChoice,
                  options: emoteOptions,
                  label: '  持续表情',
                  onChange: (v: EmoteChoice, _path: string, ctx: { initial: boolean; fromPanel: boolean }) => {
                    if (ctx.initial || !ctx.fromPanel) return
                    setGuestEmote(seat.id, v === 'auto' ? null : v)
                  },
                },
              ],
              [
                `${seat.id}·flash`,
                button(() => setGuestFlash(seat.id, { expression: 'happy', until: Date.now() + emoteTiming.temporarySeconds * 1000 }), {
                  label: '  临时表情 ^ ^',
                } as never),
              ],
              ...(['drink', 'food'] as const).map((kind) => [
                `${seat.id}·${kind}`,
                {
                  value: (getGuests()[seat.id]?.[kind] ?? 'none') as OrderChoice,
                  options: orderOptions[kind],
                  label: kind === 'drink' ? '  饮品' : '  小食',
                  onChange: (v: OrderChoice, _path: string, ctx: { initial: boolean; fromPanel: boolean }) => {
                    if (ctx.initial || !ctx.fromPanel) return
                    setGuestOrder(seat.id, kind, v === 'none' ? null : v)
                  },
                },
              ]),
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
    const values: Record<string, Choice | EmoteChoice | OrderChoice> = {}
    for (const seat of seats) {
      const g = guests[seat.id]
      values[`${seat.id}·状态`] = g?.state ?? 'none'
      values[`${seat.id}·drink`] = g?.drink ?? 'none'
      values[`${seat.id}·food`] = g?.food ?? 'none'
      values[`${seat.id}·表情`] = g?.emote ?? 'auto'
    }
    set(values as never)
    const lonely = seats.filter((s) => guests[s.id]?.state === 'talking' && !hasNeighbor(s, guests)).map((s) => s.id)
    if (lonely.length) console.info('[座位] 邻座没人，交谈按静坐处理：', lonely)
  }, [guests, seats, set])

  return <FlowDebug />
}
