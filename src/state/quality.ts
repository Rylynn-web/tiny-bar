// 画质档：auto 时触屏设备（手机、平板）用 low，其余用 high

export type Quality = 'auto' | 'high' | 'low'

export function resolveQuality(q: Quality): 'high' | 'low' {
  if (q !== 'auto') return q
  try {
    return window.matchMedia('(pointer: coarse)').matches ? 'low' : 'high'
  } catch {
    return 'high'
  }
}
