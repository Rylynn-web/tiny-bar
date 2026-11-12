import { useEffect, useSyncExternalStore } from 'react'
import { sceneConfig, type TimeOfDay } from '../config/sceneConfig'
import { useSetSceneParams } from './sceneParams'

// 访客的时区：默认用浏览器的本地时区，访客可以自己换（记在这台设备的浏览器里）。
// 场景的白天 / 夜晚按这个时区的当前钟点决定，菜单跟着场景时段换。

const KEY = 'tinybar.timezone'

export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** 可选的时区列表（浏览器支持的全部 IANA 时区；老浏览器只给本地时区和 UTC） */
export function allTimeZones(): string[] {
  const local = browserTimeZone()
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone')
    if (list?.length) return list.includes(local) ? list : [local, ...list]
  } catch {
    // 忽略，用下面的兜底
  }
  return local === 'UTC' ? ['UTC'] : [local, 'UTC']
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
    if (saved && isValid(saved)) return saved
  } catch {
    // 无痕模式等读不到存储：用本地时区
  }
  return browserTimeZone()
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
