import { useEffect, useState } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { useFlow } from '../state/flow'
import { closeReceipt, comeBackIn, leaveBar, takeSeat } from '../state/flowActions'
import { useGoodChatWatcher } from '../state/goodChat'
import { copy, fill } from './copy'
import { EntryScreen } from './EntryScreen'
import { MenuSheet } from './MenuSheet'

const O = sceneConfig.ui.overlay
const E = sceneConfig.ui.entry

/**
 * 按流程阶段显示界面。P2 骨架：开始画面之外，每个阶段只有一行提示 + 一个按钮（之后换成正式界面）
 */
export function FlowOverlay() {
  const { phase, title } = useFlow()
  const seats = useSeats()
  const [full, setFull] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useGoodChatWatcher()
  // 坐下就自动弹出菜单；离开座位就收起
  useEffect(() => {
    setMenuOpen(phase === 'seated')
  }, [phase])

  if (phase === 'entry') return <EntryScreen />

  const P = copy.phases
  let text = ''
  let action: { label: string; run: () => void } | null = null
  let secondary: { label: string; run: () => void } | null = null
  switch (phase) {
    case 'entering':
      text = fill(P.entering, { title: title ?? '' })
      break
    case 'seating':
      text = full ? P.noSeat : P.seating
      action = { label: P.seatingAction, run: () => setFull(!takeSeat(seats)) }
      break
    case 'seated':
      text = P.seated
      secondary = { label: copy.menu.open, run: () => setMenuOpen(true) }
      action = { label: P.seatedAction, run: leaveBar }
      break
    case 'leaving':
      text = P.leaving
      break
    case 'receipt':
      text = P.receipt
      action = { label: P.receiptAction, run: closeReceipt }
      break
    case 'ended':
      text = P.ended
      action = { label: P.endedAction, run: comeBackIn }
      break
  }

  return (
    <>
    <div
      className="flow-overlay"
      style={{
        bottom: `calc(${O.margin}px + env(safe-area-inset-bottom))`,
        background: O.background,
        color: O.color,
        fontFamily: E.fontFamily,
      }}
    >
      <span>{text}</span>
      {secondary && (
        <button type="button" className="flow-button" onClick={secondary.run} style={{ background: E.buttonBackground, color: E.buttonColor }}>
          {secondary.label}
        </button>
      )}
      {action && (
        <button
          type="button"
          className="flow-button"
          onClick={action.run}
          style={{ background: E.buttonBackground, color: E.buttonColor }}
        >
          {action.label}
        </button>
      )}
    </div>
    {phase === 'seated' && <MenuSheet open={menuOpen} onClose={() => setMenuOpen(false)} />}
    </>
  )
}
