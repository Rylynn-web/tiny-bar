// 称号：英文"形容词 + 名词"，进店时随机分配，同一房间里不重复。
// 用词要温柔、可爱、不冒犯：不涉及外貌、身材、年龄、性别、国籍、疾病，不用带贬义的词。

export const titleAdjectives = [
  'Mellow',
  'Sleepy',
  'Quiet',
  'Wandering',
  'Gentle',
  'Cozy',
  'Drowsy',
  'Humming',
  'Velvet',
  'Misty',
  'Sunny',
  'Little',
  'Dreamy',
  'Soft',
  'Lazy',
  'Curious',
  'Patient',
  'Starry',
  'Rainy',
  'Snug',
] as const

export const titleNouns = [
  'Cloud',
  'Fox',
  'Teacup',
  'Moth',
  'Otter',
  'Pebble',
  'Fern',
  'Lantern',
  'Sparrow',
  'Biscuit',
  'Moon',
  'Kettle',
  'Owl',
  'Clover',
  'Raccoon',
  'Marshmallow',
  'Puffin',
  'Acorn',
  'Comet',
  'Mitten',
] as const

/**
 * 生成一个房间里还没人用的称号。rand 默认 Math.random；
 * 先随机试几次，撞名了就按顺序找第一个空着的组合（400 个组合，8 个人不可能用完）
 */
export function generateTitle(taken: Iterable<string>, rand: () => number = Math.random): string {
  const used = new Set(taken)
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]
  for (let i = 0; i < 20; i++) {
    const t = `${pick(titleAdjectives)} ${pick(titleNouns)}`
    if (!used.has(t)) return t
  }
  for (const a of titleAdjectives) for (const n of titleNouns) if (!used.has(`${a} ${n}`)) return `${a} ${n}`
  return `${pick(titleAdjectives)} ${pick(titleNouns)}`
}
