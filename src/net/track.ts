// 埋点：在流程的关键节点调用。现在是空函数，之后接 PostHog（只改这里，调用方不用动）。
// 属性里不放任何个人信息，只放称号、座位、状态这类店内数据。

export type TrackEvent =
  | 'entry_shown'
  | 'step_inside'
  | 'phase_changed'
  | 'seat_taken'
  | 'status_changed'
  | 'emote_set'
  | 'drink_ordered'
  | 'song_requested'
  | 'good_chat'
  | 'leave'
  | 'receipt_shown'

export type TrackProps = Record<string, string | number | boolean | null>

export function track(event: TrackEvent, props: TrackProps = {}): void {
  // 联网前不发送；开发时可以在控制台看到
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug')) console.debug('[track]', event, props)
}
