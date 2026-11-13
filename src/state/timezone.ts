import { useEffect, useSyncExternalStore } from 'react'
import { sceneConfig, type TimeOfDay } from '../config/sceneConfig'
import { useSetSceneParams } from './sceneParams'

// 访客的时区：默认用浏览器本地时区对应的代表城市，访客可以自己换（记在这台设备的浏览器里）。
// 场景的白天 / 夜晚按这个时区的当前钟点决定，菜单跟着场景时段换。

const KEY = 'tinybar.timezone'

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 可选的时区：每个时差一个代表城市（城市名在 ui/copy.ts），按时差从西到东 */
export const timeZoneChoices = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Halifax',
  'America/Sao_Paulo',
  'Atlantic/South_Georgia',
  'Atlantic/Azores',
  'Europe/London',
  'Europe/Paris',
  'Africa/Cairo',
  'Europe/Moscow',
  'Asia/Tehran',
  'Asia/Dubai',
  'Asia/Kabul',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Adelaide',
  'Australia/Sydney',
  'Pacific/Noumea',
  'Pacific/Auckland',
] as const

/** 某个时区现在相对 UTC 的分钟数（夏令时期间会变） */
export function offsetMinutes(tz: string, now = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(now)
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0)
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'))
    return Math.round((asUtc - Math.floor(now.getTime() / 60000) * 60000) / 60000)
  } catch {
    return 0
  }
}

/** "UTC+8"、"UTC-3:30" 这样的时差文字 */
export function offsetLabel(tz: string, now = new Date()): string {
  const m = offsetMinutes(tz, now)
  const sign = m < 0 ? '-' : '+'
  const a = Math.abs(m)
  const h = Math.floor(a / 60)
  const mm = a % 60
  return `UTC${sign}${h}${mm ? `:${String(mm).padStart(2, '0')}` : ''}`
}

/** 下拉框里的列表：代表城市；访客本地时区的时差不在列表里时把它补进去（按时差排好） */
export function allTimeZones(): string[] {
  const list: string[] = [...timeZoneChoices]
  const local = browserTimeZone()
  const now = new Date()
  if (!list.some((z) => offsetMinutes(z, now) === offsetMinutes(local, now))) list.push(local)
  return list.sort((a, b) => offsetMinutes(a, now) - offsetMinutes(b, now))
}

/** 任意时区 → 列表里时差相同的代表城市（没有就保留原样） */
function toChoice(tz: string): string {
  if ((timeZoneChoices as readonly string[]).includes(tz)) return tz
  const now = new Date()
  const off = offsetMinutes(tz, now)
  return timeZoneChoices.find((z) => offsetMinutes(z, now) === off) ?? tz
}

function isValid(tz: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function load(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved && isValid(saved)) return toChoice(saved)
  } catch {
    // 无痕模式等读不到存储：用本地时区
  }
  return toChoice(browserTimeZone())
}

let zone = load()
const listeners = new Set<() => void>()

export function getTimeZone() {
  return zone
}

export function setTimeZone(tz: string) {
  if (!isValid(tz) || tz === zone) return
  zone = tz
  try {
    localStorage.setItem(KEY, tz)
  } catch {
    // 存不下也没关系，这次访问照样生效
  }
  listeners.forEach((l) => l())
}

export function useTimeZone() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => zone,
  )
}

/** 某个时区现在的钟点（0–23，带分钟的小数） */
export function hourIn(tz: string, now = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return (h % 24) + m / 60
}

/** 某个时区现在的时刻文字，比如 "21:05" */
export function clockIn(tz: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
}

export function timeOfDayAt(hour: number): TimeOfDay {
  const C = sceneConfig.clock
  return hour >= C.dayStart && hour < C.dayEnd ? 'day' : 'night'
}

/**
 * 让场景时段跟着访客时区的钟点走：进页面时、换时区时、跨过白天 / 夜晚边界时各切一次。
 * 只在"应该是哪个时段"变了的时候才写，所以 ?debug 里手动切的白天 / 夜晚会一直保持到下一次边界。
 */
export function useClockTimeOfDay() {
  const tz = useTimeZone()
  const setParams = useSetSceneParams()
  useEffect(() => {
    let last: TimeOfDay | null = null
    const check = () => {
      const t = timeOfDayAt(hourIn(tz))
      if (t === last) return
      last = t
      setParams((p) => (p.timeOfDay === t ? p : { ...p, timeOfDay: t }))
    }
    check()
    const id = setInterval(check, sceneConfig.clock.checkSeconds * 1000)
    return () => clearInterval(id)
  }, [tz, setParams])
}
