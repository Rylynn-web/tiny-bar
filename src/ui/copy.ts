// 所有界面文字（英文）。改文案只改这里；菜名也在这里。

import type { MenuId } from '../config/menu'
import type { GuestState } from '../config/poses'
import type { Expression } from '../config/expressions'

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
  // 离开：确认框（点门 / 左上角门形图标打开）
  leave: {
    button: 'Head out',
    title: 'Heading out?',
    body: 'Your little figure will walk to the door.',
    withReceipt: 'Leave with a receipt',
    without: 'Leave without',
    stay: 'Stay a bit longer',
  },
  // 小票（店名先用占位名，之后定了改这里）
  receipt: {
    shopName: 'THE TINY BAR',
    tagline: 'coffee by day · drinks by night',
    date: 'Date',
    arrived: 'Arrived',
    left: 'Left',
    stayed: 'Stayed',
    guest: 'Guest',
    orders: 'Orders',
    songs: 'Songs played',
    none: '—',
    chat: 'Had a lovely chat with {title}',
    thanks: 'Thanks for stopping by.',
    comeBack: 'Come back anytime.',
    save: 'Save receipt',
    done: 'Done',
    fileName: 'tiny-bar-receipt-{date}.png',
    printing: 'Printing your receipt…',
  },
  // 结束画面
  end: {
    title: 'See you next time.',
    body: 'The door is always open.',
    again: 'Step back inside',
  },
  // 歌单（点唱机 / 唱片架打开）
  records: {
    title: 'Records',
    subtitle: 'Pick something for the whole room.',
    nowPlaying: 'Now playing',
    paused: 'Paused',
    nothing: 'Nothing on yet',
    pickOne: 'Pick a record',
    pickHint: 'Tap a song below to put it on.',
    play: 'Play',
    pause: 'Pause',
    next: 'Next song',
    groups: { day: 'Day', night: 'Night' },
  },
  // 坐下后自己选的状态
  status: {
    label: 'What are you doing?',
    names: { idle: 'Idle', reading: 'Reading', laptop: 'Working', talking: 'Chatting' } satisfies Record<GuestState, string>,
    needsNeighbor: 'Chatting needs a neighbor',
  },
  // 表情按钮（读屏用的名字）
  emotes: {
    label: 'Expressions',
    names: {
      happy: 'Happy',
      squint: 'Oops',
      surprised: 'Surprised',
      default: 'Calm',
      focus: 'Focused',
    } satisfies Record<Expression, string>,
  },
  // 换座位
  move: {
    button: 'Move',
    hint: 'Tap a glowing seat to move.',
    cancel: 'Cancel',
  },
  timezone: {
    label: 'Your time zone',
    // 当前时区的钟点，比如 "21:05 · night"
    now: '{time} · {period}',
    period: { day: 'day', night: 'night' },
    cities: {
      'Pacific/Honolulu': 'Honolulu',
      'America/Anchorage': 'Anchorage',
      'America/Los_Angeles': 'Los Angeles',
      'America/Denver': 'Denver',
      'America/Chicago': 'Chicago',
      'America/New_York': 'New York',
      'America/Halifax': 'Halifax',
      'America/Sao_Paulo': 'São Paulo',
      'Atlantic/South_Georgia': 'South Georgia',
      'Atlantic/Azores': 'Azores',
      'Europe/London': 'London',
      'Europe/Paris': 'Paris',
      'Africa/Cairo': 'Cairo',
      'Europe/Moscow': 'Moscow',
      'Asia/Tehran': 'Tehran',
      'Asia/Dubai': 'Dubai',
      'Asia/Kabul': 'Kabul',
      'Asia/Karachi': 'Karachi',
      'Asia/Kolkata': 'Kolkata',
      'Asia/Kathmandu': 'Kathmandu',
      'Asia/Dhaka': 'Dhaka',
      'Asia/Bangkok': 'Bangkok',
      'Asia/Shanghai': 'Beijing',
      'Asia/Tokyo': 'Tokyo',
      'Australia/Adelaide': 'Adelaide',
      'Australia/Sydney': 'Sydney',
      'Pacific/Noumea': 'Nouméa',
      'Pacific/Auckland': 'Auckland',
    },
  },
  // 流程占位层：每个阶段一行提示 + 一个按钮（P2 骨架，之后换成正式界面）
  phases: {
    entering: 'Hello, {title}.',
    seating: 'Tap a glowing seat.',
    seated: 'Make yourself at home.',
    leaving: 'See you around.',
    noSeat: 'Every seat is taken right now.',
  },
}

/** 把 {key} 换成对应的值 */
export function fill(template: string, values: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? '')
}
