import { useEffect } from 'react'
import { button, folder, useControls } from 'leva'
import { useSeats } from '../config/seatConfig'
import { guestStateLabels, guestStates, type GuestState } from '../config/poses'
import { roomClient } from '../net/RoomClient'
import { trackGroups } from '../config/tracks'
import { goTo, phases, useFlow, type Phase } from '../state/flow'
import { getSessionLog } from '../state/sessionLog'
import { comeBackIn, leaveBar, stepInside, takeRandomSeat } from '../state/flowActions'

// 开发环境 ?debug 面板「流程」：看当前阶段 / 称号，强制跳到任意阶段，模拟自己的操作，打印会话记录

export function FlowDebug() {
  const seats = useSeats()
  const flow = useFlow()

  const [, set] = useControls(
    () => ({
      流程: folder(
        {
          阶段: {
            value: flow.phase as Phase,
            options: Object.fromEntries(phases.map((p) => [p, p])),
            onChange: (v: Phase, _p: string, ctx: { initial: boolean; fromPanel: boolean }) => {
              if (ctx.initial || !ctx.fromPanel) return
              goTo(v, true)
            },
          },
          称号: { value: flow.title ?? '—', editable: false },
          座位: { value: flow.seatId ?? '—', editable: false },
          进店: button(() => stepInside()),
          随机坐下: button(() => takeRandomSeat(seats)),
          我的状态: {
            value: 'idle' as GuestState,
            options: Object.fromEntries(guestStates.map((s) => [guestStateLabels[s], s])),
            onChange: (v: GuestState, _p: string, ctx: { initial: boolean; fromPanel: boolean }) => {
              if (ctx.initial || !ctx.fromPanel) return
              roomClient.setStatus(v)
            },
          },
          放第一首歌: button(() => roomClient.nowPlaying(trackGroups.day[0])),
          离开要小票: button(() => leaveBar(true)),
          离开不要小票: button(() => leaveBar(false)),
          重新进店: button(() => comeBackIn()),
          打印会话记录: button(() => console.log('[session log]', JSON.parse(JSON.stringify(getSessionLog())))),
        },
        { collapsed: false },
      ),
    }),
    [seats],
  )

  useEffect(() => {
    set({ 阶段: flow.phase, 称号: flow.title ?? '—', 座位: flow.seatId ?? '—' } as never)
  }, [flow, set])

  return null
}
