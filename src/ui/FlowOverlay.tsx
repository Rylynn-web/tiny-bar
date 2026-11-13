import { useEffect, useRef } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { useFlow } from '../state/flow'
import { useGuests } from '../state/guests'
import { useGoodChatWatcher } from '../state/goodChat'
import { copy, fill } from './copy'
import { EntryScreen } from './EntryScreen'
import { MenuSheet } from './MenuSheet'
import { StatusBar } from './StatusBar'
import { EmoteBar } from './EmoteBar'
import { cancelMove, startMove } from '../state/flowActions'
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
  const { phase, title, moving, selfId } = useFlow()
  const seats = useSeats()
  const guests = useGuests()
  const panel = usePanel()
  useGoodChatWatcher()
  // 第一次坐下自动弹出菜单（换座位之后不再弹）；不在座位上时收起所有面板
  const menuShownFor = useRef<string | null>(null)
  useEffect(() => {
    if (phase === 'seated' && selfId && menuShownFor.current !== selfId) {
      menuShownFor.current = selfId
      openPanel('menu')
    } else if (phase !== 'seated') closePanel()
  }, [phase, selfId])

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
      // 点发绿光的座位坐下（场景里的 SeatPicker）；没有空位时提示坐满了。换座位时可以取消
      text = seats.some((s) => !guests[s.id]) ? (moving ? copy.move.hint : P.seating) : P.noSeat
      if (moving) secondary = { label: copy.move.cancel, run: cancelMove }
      break
    case 'leaving':
      text = P.leaving
      break
  }

  const barStyle = {
    bottom: `calc(${O.margin}px + env(safe-area-inset-bottom))`,
    background: O.background,
    color: O.color,
    fontFamily: E.fontFamily,
  }
  const button = (b: { label: string; run: () => void }) => (
    <button type="button" className="flow-button" onClick={b.run} style={{ background: E.buttonBackground, color: E.buttonColor }}>
      {b.label}
    </button>
  )

  return (
    <>
      {phase === 'seated' ? (
        // 坐着时的底部栏（手机优先）：状态 / 表情（笑脸按钮展开）、Menu、Move；离开走左上角门形图标或场景里的门
        <div className="seated-bar" style={barStyle}>
          {/* 第一排：状态 + 笑脸（表情列表往上展开，不挡下面的按钮） */}
          <div className="bar-row">
            <StatusBar />
            <EmoteBar />
          </div>
          <div className="bar-actions">
            <button type="button" className="bar-button action-button" onClick={() => openPanel('menu')}>
              {copy.menu.open}
            </button>
            <button type="button" className="bar-button action-button" onClick={startMove}>
              {copy.move.button}
            </button>
          </div>
        </div>
      ) : (
        <div className="flow-overlay" style={barStyle}>
          <span>{text}</span>
          {secondary && button(secondary)}
        </div>
      )}
    {phase === 'seated' && <MenuSheet open={panel === 'menu'} onClose={closePanel} />}
    {phase === 'seated' && <RecordSheet open={panel === 'records'} onClose={closePanel} />}
    {phase === 'seated' && <LeaveButton />}
    {phase === 'seated' && panel === 'leave' && <LeaveDialog onClose={closePanel} />}
    </>
  )
}
