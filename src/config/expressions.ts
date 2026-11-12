// 小人表情：脸上只有眼睛，表情靠眼睛的形状变化；happy / squint 时脸颊加两团淡粉色腮红。
// 所有表情画在一张图集上（每格一个），切换只改贴图坐标；自动表情规则也都在这里调。

export type Expression = 'default' | 'happy' | 'squint' | 'surprised' | 'focus'
export const expressions: Expression[] = ['default', 'happy', 'squint', 'surprised', 'focus']
export const expressionLabels: Record<Expression, string> = {
  default: '● ● 默认',
  happy: '^ ^ 开心',
  squint: '> < 眯眼',
  surprised: '⊙ ⊙ 惊讶',
  focus: '- - 专注',
}

/** 图集：512 × 256，4 × 4 格，每格 128 × 64 像素；cells 是每种图案在第几格（从左上角数） */
export const faceAtlas = {
  width: 512,
  height: 256,
  cols: 4,
  rows: 4,
  cells: { default: 0, happy: 1, squint: 2, surprised: 3, focus: 4, blush: 5, none: 6 } as const,
  // 线条粗细、圆点 / 圆圈大小（像素，在 128 × 64 的格子里）
  stroke: 8,
  dot: { rx: 9, ry: 15 },
  ring: 12.5,
  ringDot: 4.5,
  arc: { halfWidth: 12, rise: 10 },
  // 腮红：淡粉色小椭圆（小人保持黑白，只有腮红这一点颜色）
  blush: { color: '#F4A6B4', alpha: 0.5, rx: 14, ry: 7 },
}

/** 有腮红的表情 */
export const blushing: Record<Expression, boolean> = {
  default: false,
  happy: true,
  squint: true,
  surprised: false,
  focus: false,
}

export const expressionTiming = {
  // 切换表情：先快速闭眼，闭上的那一刻换，再睁开（秒）
  switchClose: 0.07,
  switchOpen: 0.09,
  // 静坐：喝完一口饮料后开心多久
  afterSip: { expression: 'happy' as Expression, duration: 2 },
  // 阅读：平时专注，偶尔开心
  reading: { base: 'focus' as Expression, flash: 'happy' as Expression, interval: [8, 15] as [number, number], duration: 1.5 },
  // 办公：平时专注，偶尔眯一下眼（像打错字了）
  laptop: { base: 'focus' as Expression, flash: 'squint' as Expression, interval: [10, 20] as [number, number], duration: 0.8 },
  // 交谈：每次气泡轮换时，在这几种里随机挑一个
  talking: { choices: ['happy', 'surprised'] as Expression[] },
  // 邻座有人坐下：先惊讶，再开心，像在打招呼
  greet: { surprised: 1, happy: 2 },
}
