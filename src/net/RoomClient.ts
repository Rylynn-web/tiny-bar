import type { Expression } from '../config/expressions'
import { setGuestEmote } from '../state/guests'

// 房间客户端：小人和"自己"相关的操作都走这个接口。P3 联网前用本地假实现，直接改本地状态；
// 之后接多人同步时换成真正的网络实现（发给服务器、广播给同一房间的其他人），调用方不用改。

export interface RoomClient {
  /** 设置自己小人的表情；null = 回到自动表情 */
  setEmote(expression: Expression | null): void
}

/** 本地假实现：自己坐在 seatId 这个座位，设置立即在本地生效 */
export class LocalRoomClient implements RoomClient {
  private seatId: string
  constructor(seatId: string) {
    this.seatId = seatId
  }
  setEmote(expression: Expression | null) {
    setGuestEmote(this.seatId, expression)
  }
}

/** 当前使用的客户端（联网前，自己默认坐在 chair-a1） */
export const roomClient: RoomClient = new LocalRoomClient('chair-a1')
