import { sceneConfig } from '../config/sceneConfig'
import { requestLeave } from '../state/flowActions'
import { copy } from './copy'

const b = sceneConfig.ui.resetButton

/** 左上角的门形小图标：打开离开确认框（和点场景里的门是同一个流程） */
export function LeaveButton() {
  return (
    <button
      type="button"
      className="reset-view-button leave-button"
      aria-label={copy.leave.button}
      title={copy.leave.button}
      onClick={requestLeave}
      style={{
        left: `calc(${b.margin}px + env(safe-area-inset-left))`,
        top: `calc(${b.margin}px + env(safe-area-inset-top))`,
        width: b.size,
        height: b.size,
        background: b.background,
        color: b.color,
        boxShadow: b.shadow,
      }}
    >
      {/* 一扇半开的门 */}
      <svg width={b.iconSize} height={b.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 21h16" />
        <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
        <path d="M14 21V6.5l-5-1.5v14.5" />
        <circle cx="12" cy="12.5" r="0.6" fill="currentColor" />
      </svg>
    </button>
  )
}
