import type { Expression } from '../config/expressions'
import type { GuestState } from '../config/poses'
import { generateTitle } from '../config/titles'
import { menuItems, type MenuId } from '../config/menu'
import { MAX_GUESTS, getGuests, newSeed } from '../state/guests'
import { getNowPlaying } from '../state/nowPlaying'
import { logLeft, logOrder, logSong } from '../state/sessionLog'
import { applyServerMessage } from './applyServerMessage'
import type { ClientMessage, GuestSnapshot, ServerMessage } from './protocol'
import { nextTrackId, tracks, type TrackId } from '../config/tracks'
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
  /** 点单：桌上最多一杯饮品 + 一份小食，再点同类会替换原来的 */
  order(item: MenuId): void
  /** 选歌：放这一首（全店一起听；当前在放什么用 state/nowPlaying 的 useNowPlaying 读） */
  nowPlaying(trackId: TrackId): void
  /** 播放 / 暂停当前这首 */
  setPlaying(playing: boolean): void
  /** 下一首（同一组里往下，最后一首之后回到第一首） */
  nextTrack(): void
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
  order(item: MenuId) {
    logOrder(item)
    track('drink_ordered', { item, kind: menuItems[item].kind })
    this.send({ type: 'order', item })
  }
  nowPlaying(trackId: TrackId, source: 'list' | 'next' = 'list') {
    const info = tracks[trackId]
    logSong(trackId, info.title, info.artist)
    track('track_played', { trackId, group: info.group, source })
    this.send({ type: 'play', trackId })
  }
  setPlaying(playing: boolean) {
    this.send({ type: 'setPlaying', playing })
  }
  nextTrack() {
    const now = getNowPlaying()
    if (now) this.nowPlaying(nextTrackId(now.trackId), 'next')
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
  /** 上一次进店用过的称号：重新进店时避开，保证拿到新的 */
  private lastTitle: string | null = null

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
        if (this.lastTitle) taken.push(this.lastTitle)
        const title = generateTitle(taken)
        this.lastTitle = title
        this.me = { id: `local-${++this.ids}`, title, seatId: null, state: 'idle', drink: null, food: null, emote: null, seed: newSeed() }
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
        // 假装做好了：立刻端上来，同类的替换掉
        this.update({ [menuItems[msg.item].kind]: msg.item })
        this.reply({ type: 'orderReady', item: msg.item })
        break
      case 'play':
        // 假装马上开始放，记下是谁放的
        if (!this.me) return this.reply({ type: 'error', reason: 'notSeated' })
        this.reply({ type: 'nowPlaying', nowPlaying: { trackId: msg.trackId, playing: true, by: this.me.id } })
        break
      case 'setPlaying': {
        const now = getNowPlaying()
        if (now) this.reply({ type: 'nowPlaying', nowPlaying: { ...now, playing: msg.playing } })
        break
      }
      case 'leave':
        if (this.me) this.reply({ type: 'guestLeft', id: this.me.id })
        this.me = null
        break
    }
  }
}

/** 当前使用的客户端 */
export const roomClient: RoomClient = new LocalRoomClient()
