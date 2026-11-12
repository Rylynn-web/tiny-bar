import { useEffect, useMemo, useState } from 'react'
import { allTimeZones, clockIn, hourIn, setTimeZone, timeOfDayAt, useTimeZone } from '../state/timezone'
import { copy, fill } from './copy'

/** 时区选择：默认是浏览器的本地时区，访客可以换成任意时区；旁边显示那个时区现在几点、是白天还是夜晚 */
export function TimeZonePicker({ className }: { className?: string }) {
  const tz = useTimeZone()
  const zones = useMemo(() => allTimeZones(), [])
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
        {zones.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      <span className="tz-now">{fill(copy.timezone.now, { time: clockIn(tz, now), period: copy.timezone.period[period] })}</span>
    </label>
  )
}
