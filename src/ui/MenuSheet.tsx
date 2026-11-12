import { sceneConfig } from '../config/sceneConfig'
import { menuItems, menus, type MenuId } from '../config/menu'
import { roomClient } from '../net/RoomClient'
import { findSelfSeat, useGuests } from '../state/guests'
import { useSceneParams } from '../state/sceneParams'
import { copy } from './copy'
import { TimeZonePicker } from './TimeZonePicker'

const U = sceneConfig.ui.menu

/**
 * 底部弹出的菜单：按场景时段（跟着访客时区的钟点）显示白天 / 夜晚菜单。
 * 每项只有图片和名字；点一下就下单，马上出现在桌上。已经在桌上的那一项有描边。
 */
export function MenuSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { timeOfDay } = useSceneParams()
  const guests = useGuests()
  const seatId = findSelfSeat(guests)
  const me = seatId ? guests[seatId] : null
  const onTable = (id: MenuId) => me?.drink === id || me?.food === id

  return (
    <>
      <div className={`menu-scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <section
        className={`menu-sheet ${open ? 'open' : ''}`}
        aria-hidden={!open}
        aria-label={copy.menu.title[timeOfDay]}
        style={{ background: U.background, color: U.color, boxShadow: U.shadow, borderRadius: `${U.radius}px ${U.radius}px 0 0` }}
      >
        <header className="menu-header">
          <div>
            <h2>{copy.menu.title[timeOfDay]}</h2>
            <p>{copy.menu.subtitle[timeOfDay]}</p>
          </div>
          <button type="button" className="menu-close" onClick={onClose} aria-label={copy.menu.close}>
            ×
          </button>
        </header>
        <div className="menu-grid">
          {menus[timeOfDay].map((id) => {
            const selected = onTable(id)
            return (
              <button
                key={id}
                type="button"
                className={`menu-card ${selected ? 'selected' : ''}`}
                onClick={() => roomClient.order(id)}
                tabIndex={open ? 0 : -1}
                style={{ background: U.cardBackground, borderColor: selected ? U.selected : 'transparent' }}
              >
                <img src={menuItems[id].image} alt="" width={256} height={256} draggable={false} />
                <span className="menu-name">{copy.menu.items[id]}</span>
                {selected && (
                  <span className="menu-badge" style={{ color: U.selected }}>
                    {copy.menu.onTable}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <TimeZonePicker className="menu-tz" />
      </section>
    </>
  )
}
