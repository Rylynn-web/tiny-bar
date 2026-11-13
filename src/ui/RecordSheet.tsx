import { sceneConfig } from '../config/sceneConfig'
import { formatDuration, trackGroups, tracks, type TrackId } from '../config/tracks'
import { roomClient } from '../net/RoomClient'
import { useNowPlaying } from '../state/nowPlaying'
import { useSceneParams } from '../state/sceneParams'
import { copy } from './copy'

const U = sceneConfig.ui.menu
const R = sceneConfig.ui.records

/** 封套正面：底色 + 几个简单的几何图形（按曲目配色），像一张小唱片封套 */
function Sleeve({ trackId, size }: { trackId: TrackId | null; size: number }) {
  const { palette } = useSceneParams()
  const t = trackId ? tracks[trackId] : null
  const bg = t ? palette[t.sleeve as keyof typeof palette] : R.emptySleeve
  const fg = t ? palette[t.label as keyof typeof palette] : R.emptyLabel
  return (
    <svg className="sleeve" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="4" fill={bg} />
      {t && (
        <>
          <circle cx="68" cy="34" r="20" fill={fg} />
          <rect x="12" y="62" width="44" height="6" rx="3" fill={R.ink} opacity="0.85" />
          <rect x="12" y="74" width="28" height="6" rx="3" fill={R.ink} opacity="0.5" />
        </>
      )}
    </svg>
  )
}

/** 从封套里探出半边的黑胶：在放的时候慢慢转 */
function Vinyl({ trackId, spinning }: { trackId: TrackId | null; spinning: boolean }) {
  const { palette } = useSceneParams()
  const label = trackId ? palette[tracks[trackId].label as keyof typeof palette] : R.emptyLabel
  return (
    <div
      className={`vinyl ${spinning ? 'spinning' : ''}`}
      style={{
        background: `radial-gradient(circle, ${label} 0 17%, ${R.vinyl} 18% 22%, ${R.groove} 23% 24%, ${R.vinyl} 25% 33%, ${R.groove} 34% 35%, ${R.vinyl} 36% 46%, ${R.groove} 47% 48%, ${R.vinyl} 49%)`,
        animationDuration: `${R.spinSeconds}s`,
      }}
      aria-hidden="true"
    >
      <span className="vinyl-hole" />
    </div>
  )
}

/**
 * 歌单面板（只有界面，不播放声音）：上面是"现在在放"——封套 + 探出来的黑胶 + 曲名 + 播放 / 暂停、下一首；
 * 下面是按白天 / 夜晚分组的曲目列表，当前时段那组在前。点一首就放这首。
 */
export function RecordSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const now = useNowPlaying()
  const { timeOfDay, palette } = useSceneParams()
  const current = now ? tracks[now.trackId] : null
  const groups = timeOfDay === 'day' ? (['day', 'night'] as const) : (['night', 'day'] as const)
  const C = copy.records

  return (
    <>
      <div className={`menu-scrim ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <section
        className={`menu-sheet record-sheet ${open ? 'open' : ''}`}
        aria-hidden={!open}
        aria-label={C.title}
        style={{ background: U.background, color: U.color, boxShadow: U.shadow, borderRadius: `${U.radius}px ${U.radius}px 0 0` }}
      >
        <header className="menu-header">
          <div>
            <h2>{C.title}</h2>
            <p>{C.subtitle}</p>
          </div>
          <button type="button" className="menu-close" onClick={onClose} aria-label={copy.menu.close} tabIndex={open ? 0 : -1}>
            ×
          </button>
        </header>

        {/* 现在在放 */}
        <div className="now-playing">
          <div className="sleeve-stack">
            <Vinyl trackId={now?.trackId ?? null} spinning={!!now?.playing && open} />
            <Sleeve trackId={now?.trackId ?? null} size={R.sleeveSize} />
          </div>
          <div className="now-info">
            <span className="now-label">{now ? (now.playing ? C.nowPlaying : C.paused) : C.nothing}</span>
            <strong className="now-title">{current ? current.title : C.pickOne}</strong>
            <span className="now-artist">{current ? `${current.artist} · ${formatDuration(current.duration)}` : C.pickHint}</span>
            <div className="now-controls">
              <button
                type="button"
                className="round-button"
                disabled={!now}
                onClick={() => now && roomClient.setPlaying(!now.playing)}
                aria-label={now?.playing ? C.pause : C.play}
                tabIndex={open ? 0 : -1}
                style={{ background: R.ink, color: U.background }}
              >
                {now?.playing ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <rect x="3" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                    <rect x="9.5" y="2" width="3.5" height="12" rx="1" fill="currentColor" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M4 2.5v11a.8.8 0 0 0 1.2.7l9-5.5a.8.8 0 0 0 0-1.4l-9-5.5A.8.8 0 0 0 4 2.5Z" fill="currentColor" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className="round-button ghost"
                disabled={!now}
                onClick={() => roomClient.nextTrack()}
                aria-label={C.next}
                tabIndex={open ? 0 : -1}
                style={{ borderColor: R.ink, color: R.ink }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.5 3v10a.7.7 0 0 0 1.1.6l7-5a.7.7 0 0 0 0-1.2l-7-5A.7.7 0 0 0 2.5 3Z" fill="currentColor" />
                  <rect x="11.5" y="2.5" width="2.5" height="11" rx="1" fill="currentColor" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 曲目列表：当前时段那组在前 */}
        {groups.map((g) => (
          <div key={g} className="track-group">
            <h3>{C.groups[g]}</h3>
            <ol>
              {trackGroups[g].map((id) => {
                const t = tracks[id]
                const active = now?.trackId === id
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className={`track-row ${active ? 'active' : ''}`}
                      onClick={() => roomClient.nowPlaying(id)}
                      tabIndex={open ? 0 : -1}
                      style={{ borderColor: active ? U.selected : 'transparent' }}
                    >
                      <span className="track-chip" style={{ background: palette[t.sleeve as keyof typeof palette] }}>
                        <span style={{ background: palette[t.label as keyof typeof palette] }} />
                      </span>
                      <span className="track-text">
                        <span className="track-title">{t.title}</span>
                        <span className="track-artist">{t.artist}</span>
                      </span>
                      {active && (
                        <span className="track-on" style={{ color: U.selected }} aria-label={C.nowPlaying}>
                          ♪
                        </span>
                      )}
                      <span className="track-time">{formatDuration(t.duration)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </section>
    </>
  )
}
