// 浏览器音频解锁：浏览器要求声音必须在用户点击之后才能播放。
// 点 "Step inside" 时在同一次点击里创建 / 恢复 AudioContext，之后的背景音乐、音效都用它。

let ctx: AudioContext | null = null

/** 必须在点击事件的回调里同步调用 */
export function unlockAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      ctx = new Ctor()
    }
    if (ctx.state === 'suspended') void ctx.resume()
    // iOS 上还要真的播一小段静音，才算解锁
    const buffer = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    return null
  }
  return ctx
}

export function getAudioContext() {
  return ctx
}
