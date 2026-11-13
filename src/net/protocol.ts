import type { Expression } from '../config/expressions'
import type { GuestState } from '../config/poses'
import type { MenuId } from '../config/menu'
import type { TrackId } from '../config/tracks'

// 消息协议（草案）：客户端 ↔ 房间服务器。P3 接真网络层时按这里收发 JSON，
// 本地假实现（LocalRoomClient）也按同样的消息走一遍，UI 只看状态，不关心消息从哪来。

/** 店里正在放的歌：哪一首、在放还是暂停、是谁放的（客人 id） */
export type NowPlaying = { trackId: TrackId; playing: boolean; by: string }

/** 房间里一个客人的公开信息（广播给同房间所有人） */
export type GuestSnapshot = {
  id: string
  title: string
  /** 没坐下（还在门口 / 正在离开）为 null */
  seatId: string | null
  state: GuestState
  /** 桌上的饮品 / 小食（各最多一份，再点同类就替换） */
  drink: MenuId | null
  food: MenuId | null
  emote: Expression | null
  seed: number
}

// ───────── 客户端 → 服务器 ─────────
export type ClientMessage =
  | { type: 'join' }
  | { type: 'sit'; seatId: string }
  | { type: 'status'; state: GuestState }
  | { type: 'emote'; expression: Expression | null }
  | { type: 'order'; item: MenuId }
  /** 放这一首（从头开始） */
  | { type: 'play'; trackId: TrackId }
  /** 播放 / 暂停当前这首 */
  | { type: 'setPlaying'; playing: boolean }
  | { type: 'leave' }

// ───────── 服务器 → 客户端 ─────────
export type ServerMessage =
  /** 进店成功：分配给你的 id 和称号（同房间不重复），以及房间当前的样子 */
  | { type: 'welcome'; you: { id: string; title: string }; guests: GuestSnapshot[]; nowPlaying: NowPlaying | null }
  /** 有人进店、坐下、换状态、换表情、点了饮料（包括自己） */
  | { type: 'guestUpdated'; guest: GuestSnapshot }
  /** 有人离店 */
  | { type: 'guestLeft'; id: string }
  /** 正在放的歌变了 */
  | { type: 'nowPlaying'; nowPlaying: NowPlaying | null }
  /** 你点的东西做好了 */
  | { type: 'orderReady'; item: MenuId }
  /** 请求被拒绝（座位已经有人、房间满了…） */
  | { type: 'error'; reason: 'seatTaken' | 'roomFull' | 'notSeated' }
