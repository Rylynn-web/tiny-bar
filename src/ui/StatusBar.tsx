import { sceneConfig } from '../config/sceneConfig'
import { useSeats } from '../config/seatConfig'
import { guestStates } from '../config/poses'
import { roomClient } from '../net/RoomClient'
import { findSelfSeat, hasNeighbor, useGuests } from '../state/guests'
import { copy } from './copy'

const U = sceneConfig.ui

/**
 * 坐下后自己选状态：静坐 / 阅读 / 办公 / 交谈，当前的高亮。
 * 交谈要邻座有人才能选（没人时按钮变灰，下面提示一句）
 */
export function StatusBar() {
  const seats = useSeats()
  const guests = useGuests()
  const seatId = findSelfSeat(guests)
  const seat = seats.find((s) => s.id === seatId)
  const me = seatId ? guests[seatId] : null
  const canChat = !!seat && hasNeighbor(seat, guests)
  // 选了交谈但邻座的人走了：实际按静坐显示
  const current = me?.state === 'talking' && !canChat ? 'idle' : me?.state

  return (
    <div className="status-group" role="radiogroup" aria-label={copy.status.label}>
      {guestStates.map((s) => {
        const disabled = s === 'talking' && !canChat
        const active = current === s
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            className={`status-button ${active ? 'active' : ''}`}
            disabled={!me || disabled}
            title={disabled ? copy.status.noOneNearby : undefined}
            onClick={() => roomClient.setStatus(s)}
            style={{
              background: active ? U.entry.buttonBackground : 'transparent',
              color: active ? U.entry.buttonColor : U.overlay.color,
              borderColor: active ? U.menu.selected : 'transparent',
            }}
          >
            {copy.status.names[s]}
          </button>
        )
      })}
      {!canChat && <span className="status-hint">{copy.status.noOneNearby}</span>}
    </div>
  )
}
