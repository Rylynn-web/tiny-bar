// 所有界面文字（英文）。改文案只改这里；菜名也在这里。

import type { MenuId } from '../config/menu'

export const copy = {
  entry: {
    name: 'The Tiny Bar',
    tagline: 'A small place where nobody has to talk.',
    stepInside: 'Step inside',
  },
  menu: {
    title: { day: 'Day menu', night: 'Night menu' },
    subtitle: { day: 'Coffee and something warm.', night: 'Something to sip, something to share.' },
    open: 'Menu',
    close: 'Close',
    // 已经在桌上的那一项
    onTable: 'On your table',
    items: {
      coffee: 'Coffee',
      latte: 'Latte',
      matcha: 'Matcha',
      bread: 'Bread',
      sunrise: 'Sunrise',
      whiskey: 'Whiskey',
      redwine: 'Red Wine',
      fries: 'Fries',
    } satisfies Record<MenuId, string>,
  },
  timezone: {
    label: 'Your time zone',
    // 当前时区的钟点，比如 "21:05 · night"
    now: '{time} · {period}',
    period: { day: 'day', night: 'night' },
  },
  // 流程占位层：每个阶段一行提示 + 一个按钮（P2 骨架，之后换成正式界面）
  phases: {
    entering: 'Hello, {title}.',
    seating: 'Pick any free seat.',
    seatingAction: 'Take a seat',
    seated: 'Make yourself at home.',
    seatedAction: 'Leave',
    leaving: 'See you around.',
    receipt: 'Your receipt is being printed…',
    receiptAction: 'Close',
    ended: 'Thanks for stopping by.',
    endedAction: 'Come back in',
    noSeat: 'Every seat is taken right now.',
  },
}

/** 把 {key} 换成对应的值 */
export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')
}
