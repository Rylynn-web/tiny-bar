import type { Expression } from '../config/expressions'
import type { GuestState } from '../config/poses'
import { generateTitle } from '../config/titles'
import { MAX_GUESTS, getGuests, newSeed } from '../state/guests'
import { getNowPlaying } from '../state/nowPlaying'
import { logLeft, logOrder, logSong } from '../state/sessionLog'
import { applyServerMessage } from './applyServerMessage'
import type { ClientMessage, GuestSnapshot, ServerMessage, Track } from './protocol'
import { track } from './track'

// 房间客户端：和"自己"相关的操作都走这个接口，按 protocol.ts 的消息收发。
// P3 联网前用本地假实现（LocalRoomClient）在本地模拟服务器；之后换成 WebSocket 实现，
// 只要同样把收到的消息交给 applyServerMessage，UI 一行都不用改。

export interface RoomClient {
  /** 进店：房间分配 id 和称号（同房间不重复） */
  join(): void
  /** 坐到一个座位上 */
  sit(seatId: string): void
  /** 换状态：静坐 / 阅读 / 办公 / 交谈 */
  setStatus(state: GuestState): void
  /** 设置自己小人的表情；null = 回到自动表情 */
  setEmote(expression: Expression | null): void
  /** 点单（饮料 / 咖啡的名字） */
  order(item: string): void
  /** 点歌 */
  requestSong(song: Track): void
  /** 店里正在放的歌（变化用 state/nowPlaying 的 useNowPlaying / subscribeNowPlaying 监听） */
  nowPlaying(): Track | null
  /** 离店 */
  leave(): void
}

/** 公共部分：埋点、会话记录在这里做，具体怎么发给服务器由子类决定 */
abstract class BaseRoomClient implements RoomClient {
  protected abstract send(msg: ClientMessage): void

  join() {
    this.send({ type: 'join' })
  }
  sit(seatId: string) {
    track('seat_taken', { seatId })
    this.send({ type: 'sit', seatId })
  }
  setStatus(state: GuestState) {
    track('status_changed', { state })
    this.send({ type: 'status', state })
  }
  setEmote(expression: Expression | null) {
    track('emote_set', { expression })
    this.send({ type: 'emote', expression })
  }
  order(item: string) {
    logOrder(item)
    track('order_placed', { item })
    this.send({ type: 'order', item })
  }
  requestSong(song: Track) {
    logSong(song.title, song.artist)
    track('song_requested', { title: song.title, artist: song.artist })
    this.send({ type: 'requestSong', track: song })
  }
  nowPlaying() {
    return getNowPlaying()
  }
  leave() {
    logLeft()
    track('leave')
    this.send({ type: 'leave' })
  }
}

/** 本地假实现：在本地模拟房间服务器，回复的消息稍后（模拟网络）交给 applyServerMessage */
export class LocalRoomClient extends BaseRoomClient {
  private me: GuestSnapshot | null = null
  private ids = 0

  private reply(...msgs: ServerMessage[]) {
    setTimeout(() => msgs.forEach(applyServerMessage), 0)
  }

  private update(patch: Partial<GuestSnapshot>) {
    if (!this.me) return this.reply({ type: 'error', reason: 'notSeated' })
    this.me = { ...this.me, ...patch }
    this.reply({ type: 'guestUpdated', guest: this.me })
  }

  protected send(msg: ClientMessage) {
    const guests = getGuests()
    switch (msg.type) {
      case 'join': {
        const taken = Object.values(guests).map((g) => g.title ?? '')
        const title = generateTitle(taken)
        this.me = { id: `local-${++this.ids}`, title, seatId: null, state: 'idle', drink: false, emote: null, seed: newSeed() }
        const others: GuestSnapshot[] = []
        this.reply({ type: 'welcome', you: { id: this.me.id, title }, guests: others, nowPlaying: getNowPlaying() })
        break
      }
      case 'sit': {
        const occupant = guests[msg.seatId]
        if (occupant && !occupant.self) return this.reply({ type: 'error', reason: 'seatTaken' })
        if (!occupant && Object.keys(guests).length >= MAX_GUESTS) return this.reply({ type: 'error', reason: 'roomFull' })
        if (!this.me) return this.reply({ type: 'error', reason: 'notSeated' })
        this.update({ seatId: msg.seatId })
        break
      }
      case 'status':
        this.update({ state: msg.state })
        break
      case 'emote':
        this.update({ emote: msg.expression })
        break
      case 'order':
        // 假装做好了：立刻端上来
        this.update({ drink: true })
        this.reply({ type: 'orderReady', item: msg.item })
        break
      case 'requestSong':
        // 假装马上开始放
        this.reply({ type: 'nowPlaying', track: msg.track })
        break
      case 'leave':
        if (this.me) this.reply({ type: 'guestLeft', id: this.me.id })
        this.me = null
        break
    }
  }
}

/** 当前使用的客户端 */
export const roomClient: RoomClient = new LocalRoomClient()
