import type { TimeOfDay } from './sceneConfig'

// 歌单：先放 10 首占位曲目（名字原创、不对应真实歌曲），按白天 / 夜晚分组。
// 这一批只有界面，不播放音频；之后接音源时给每首加上文件地址即可。
// sleeve / label：唱片封套和中间标签的颜色（调色板键名）

export type TrackId =
  | 'morning-steam'
  | 'window-seat'
  | 'paper-boats'
  | 'slow-sunday'
  | 'oat-milk-waltz'
  | 'neon-drizzle'
  | 'last-tram'
  | 'velvet-hour'
  | 'amber-glass'
  | 'quiet-encore'

export type TrackInfo = {
  id: TrackId
  title: string
  artist: string
  /** 时长（秒） */
  duration: number
  group: TimeOfDay
  sleeve: string
  label: string
}

const t = (id: TrackId, title: string, artist: string, duration: number, group: TimeOfDay, sleeve: string, label: string): TrackInfo => ({
  id,
  title,
  artist,
  duration,
  group,
  sleeve,
  label,
})

export const tracks: Record<TrackId, TrackInfo> = {
  'morning-steam': t('morning-steam', 'Morning Steam', 'The Teaspoons', 204, 'day', 'accentLemon', 'accentCobalt'),
  'window-seat': t('window-seat', 'Window Seat', 'Lila Fern', 187, 'day', 'accentCyan', 'accentLemon'),
  'paper-boats': t('paper-boats', 'Paper Boats', 'Small Harbour', 231, 'day', 'accentGrass', 'accentPink'),
  'slow-sunday': t('slow-sunday', 'Slow Sunday', 'June & the Kettles', 198, 'day', 'accentPink', 'accentGrass'),
  'oat-milk-waltz': t('oat-milk-waltz', 'Oat Milk Waltz', 'Café Quartet', 246, 'day', 'accentVermilion', 'accentCyan'),
  'neon-drizzle': t('neon-drizzle', 'Neon Drizzle', 'Midnight Laundry', 223, 'night', 'accentCobalt', 'accentVermilion'),
  'last-tram': t('last-tram', 'Last Tram Home', 'Ostrich Blue', 265, 'night', 'accentVermilion', 'accentLemon'),
  'velvet-hour': t('velvet-hour', 'Velvet Hour', 'Moth & Lantern', 241, 'night', 'accentPink', 'accentCobalt'),
  'amber-glass': t('amber-glass', 'Amber Glass', 'The Late Pours', 209, 'night', 'accentLemon', 'accentVermilion'),
  'quiet-encore': t('quiet-encore', 'Quiet Encore', 'Nina Overcoat', 278, 'night', 'accentCyan', 'accentPink'),
}

/** 每组的曲目顺序 */
export const trackGroups: Record<TimeOfDay, TrackId[]> = {
  day: ['morning-steam', 'window-seat', 'paper-boats', 'slow-sunday', 'oat-milk-waltz'],
  night: ['neon-drizzle', 'last-tram', 'velvet-hour', 'amber-glass', 'quiet-encore'],
}

/** 同一组里的下一首（最后一首之后回到第一首） */
export function nextTrackId(id: TrackId): TrackId {
  const list = trackGroups[tracks[id].group]
  return list[(list.indexOf(id) + 1) % list.length]
}

/** 3:24 这样的时长文字 */
export function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
