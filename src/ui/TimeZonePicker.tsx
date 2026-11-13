import { useEffect, useMemo, useState } from 'react'
import { allTimeZones, clockIn, hourIn, offsetLabel, setTimeZone, timeOfDayAt, useTimeZone } from '../state/timezone'
import { copy, fill } from './copy'

/** 代表城市的英文名；列表外的时区（访客本地时区补进来的）用时区名里的城市 */
function cityName(tz: string) {
  return (copy.timezone.cities as Record<string, string>)[tz] ?? tz.split('/').pop()!.replace(/_/g, ' ')
}

/** 时区选择：默认是浏览器的本地时区，访客可以换成任意时区；旁边显示那个时区现在几点、是白天还是夜晚 */
export function TimeZonePicker({ className }: { className?: string }) {
  const tz = useTimeZone()
  const zones = useMemo(() => allTimeZones(), [])
  // 列表里没有当前时区（极少见）时也要能显示
  const options = zones.includes(tz) ? zones : [tz, ...zones]
  // 每 30 秒刷新一下显示的钟点
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(id)
  }, [])
  const period = timeOfDayAt(hourIn(tz, now))

  return (
    <label className={`tz-picker ${className ?? ''}`}>
      <span className="tz-label">{copy.timezone.label}</span>
      <select value={tz} onChange={(e) => setTimeZone(e.target.value)}>
        {options.map((z) => (
          <option key={z} value={z}>
            {offsetLabel(z, now)} · {cityName(z)}
          </option>
        ))}
      </select>
      <span className="tz-now">{fill(copy.timezone.now, { time: clockIn(tz, now), period: copy.timezone.period[period] })}</span>
    </label>
  )
}
