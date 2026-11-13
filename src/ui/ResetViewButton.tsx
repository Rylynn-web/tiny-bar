import { sceneConfig } from '../config/sceneConfig'
import { requestResetView } from '../state/cameraActions'

const b = sceneConfig.ui.resetButton

/** "回到全景"按钮：平时在右下角；坐着时底部栏占满了下方，挪到右上角 */
export function ResetViewButton({ corner = 'bottom' }: { corner?: 'top' | 'bottom' }) {
  return (
    <button
      type="button"
      className="reset-view-button"
      aria-label="回到全景"
      title="回到全景"
      onClick={requestResetView}
      style={{
        right: `calc(${b.margin}px + env(safe-area-inset-right))`,
        ...(corner === 'top'
          ? { top: `calc(${b.margin}px + env(safe-area-inset-top))` }
          : { bottom: `calc(${b.margin}px + env(safe-area-inset-bottom))` }),
        width: b.size,
        height: b.size,
        background: b.background,
        color: b.color,
        boxShadow: b.shadow,
      }}
    >
      {/* 四角取景框图标 */}
      <svg width={b.iconSize} height={b.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9V5a1 1 0 0 1 1-1h4" />
        <path d="M15 4h4a1 1 0 0 1 1 1v4" />
        <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
        <path d="M9 20H5a1 1 0 0 1-1-1v-4" />
      </svg>
    </button>
  )
}
