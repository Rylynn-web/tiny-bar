import { useEffect } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { useFlow } from '../state/flow'
import { useGuests } from '../state/guests'
import { useGoodChatWatcher } from '../state/goodChat'
import { copy, fill } from './copy'
import { EntryScreen } from './EntryScreen'
import { MenuSheet } from './MenuSheet'
import { StatusBar } from './StatusBar'
import { RecordSheet } from './RecordSheet'
import { LeaveButton } from './LeaveButton'
import { LeaveDialog } from './LeaveDialog'
import { ReceiptView } from './ReceiptView'
import { EndScreen } from './EndScreen'
import { closePanel, openPanel, usePanel } from '../state/panels'

const O = sceneConfig.ui.overlay
const E = sceneConfig.ui.entry

/**
 * 按流程阶段显示界面：开始画面 / 进店和选座的提示 / 坐着时的底部栏、菜单、歌单、离开确认框 / 小票 / 结束画面
 */
export function FlowOverlay() {
  const { phase, title } = useFlow()
  const seats = useSeats()
  const guests = useGuests()
  const panel = usePanel()
  useGoodChatWatcher()
  // 坐下就自动弹出菜单；离开座位就收起所有面板
  useEffect(() => {
    openPanel(phase === 'seated' ? 'menu' : null)
  }, [phase])

  if (phase === 'entry') return <EntryScreen />
  if (phase === 'receipt') return <ReceiptView />
  if (phase === 'ended') return <EndScreen />

  const P = copy.phases
  let text = ''
  let secondary: { label: string; run: () => void } | null = null
  switch (phase) {
    case 'entering':
      text = fill(P.entering, { title: title ?? '' })
      break
    case 'seating':
      // 点发绿光的座位坐下（场景里的 SeatPicker）；没有空位时提示坐满了
      text = seats.some((s) => !guests[s.id]) ? P.seating : P.noSeat
      break
    case 'seated':
      // 坐着时不显示提示文字，换成一排状态按钮
      // 离开走左上角的门形图标或场景里的门（都先弹确认框）
      secondary = { label: copy.menu.open, run: () => openPanel('menu') }
      break
    case 'leaving':
      text = P.leaving
      break
  }

  return (
    <>
    <div
      className={`flow-overlay ${phase === 'seated' ? 'seated' : ''}`}
      style={{
        bottom: `calc(${O.margin}px + env(safe-area-inset-bottom))`,
        background: O.background,
        color: O.color,
        fontFamily: E.fontFamily,
      }}
    >
      {phase === 'seated' ? <StatusBar /> : <span>{text}</span>}
      {secondary && (
        <button type="button" className="flow-button" onClick={secondary.run} style={{ background: E.buttonBackground, color: E.buttonColor }}>
          {secondary.label}
        </button>
      )}
    </div>
    {phase === 'seated' && <MenuSheet open={panel === 'menu'} onClose={closePanel} />}
    {phase === 'seated' && <RecordSheet open={panel === 'records'} onClose={closePanel} />}
    {phase === 'seated' && <LeaveButton />}
    {phase === 'seated' && panel === 'leave' && <LeaveDialog onClose={closePanel} />}
    </>
  )
}
