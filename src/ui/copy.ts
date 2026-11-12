// 所有界面文字（英文）。改文案只改这里；小黑板上的粉笔字也在这里。

export const copy = {
  entry: {
    name: 'The Tiny Bar',
    tagline: 'A small place where nobody has to talk.',
    stepInside: 'Step inside',
  },
  chalkboard: {
    // 平时：店名 + 一句欢迎
    idleTitle: 'Welcome',
    idleLines: ['coffee by day', 'drinks by night'],
    // 进店后："Tonight you are" + 称号
    greeting: 'Tonight you are',
    greetingDay: 'Today you are',
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
