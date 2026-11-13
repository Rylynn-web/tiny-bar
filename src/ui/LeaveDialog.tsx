import { useEffect } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { leaveBar } from '../state/flowActions'
import { copy } from './copy'

const U = sceneConfig.ui.menu
const R = sceneConfig.ui.records

/** 离开确认框：要小票离开 / 不要小票离开 / 再坐一会儿 */
export function LeaveDialog({ onClose }: { onClose: () => void }) {
  const C = copy.leave
  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="dialog-scrim" onClick={onClose}>
      <div
        className="leave-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        onClick={(e) => e.stopPropagation()}
        style={{ background: U.background, color: U.color, boxShadow: U.shadow }}
      >
        <h2 id="leave-title">{C.title}</h2>
        <p>{C.body}</p>
        <button type="button" className="dialog-button primary" autoFocus onClick={() => leaveBar(true)} style={{ background: R.ink, color: U.background }}>
          {C.withReceipt}
        </button>
        <button type="button" className="dialog-button" onClick={() => leaveBar(false)} style={{ borderColor: R.ink, color: R.ink }}>
          {C.without}
        </button>
        <button type="button" className="dialog-button quiet" onClick={onClose} style={{ color: U.color }}>
          {C.stay}
        </button>
      </div>
    </div>
  )
}
