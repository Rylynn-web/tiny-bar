// 小人的姿势与动作参数。角度一律是弧度（用 deg() 写成度数方便读），长度是小人的设计单位
//（全身高 2.8，最后整体缩放到 sceneConfig.buddy.height），道具尺寸是米。
//
// 旋转方向（都是各部位自己的局部坐标）：
//   lean       身体前倾为正（绕 X），后靠为负
//   turn       身体左右转（绕 Y），正 = 往小人自己的左边
//   headPitch  低头为正；headYaw 往左为正；headRoll 歪头
//   armPitch   手臂往前抬为负（-90° = 平伸向前，-180° = 举过头顶）
//   armSplay   手臂往外张为正，往里收（两手靠拢）为负

import { MathUtils } from 'three'
import type { SeatPose } from './seatConfig'

const deg = MathUtils.degToRad

export type GuestState = 'idle' | 'reading' | 'laptop' | 'talking'
export const guestStates: GuestState[] = ['idle', 'reading', 'laptop', 'talking']
export const guestStateLabels: Record<GuestState, string> = {
  idle: '静坐',
  reading: '阅读',
  laptop: '办公',
  talking: '交谈',
}

export type SeatType = SeatPose

/** 一组可以平滑过渡的姿势参数 */
export type Pose = {
  lean: number
  turn: number
  headPitch: number
  headYaw: number
  headRoll: number
  armLPitch: number
  armLSplay: number
  armRPitch: number
  armRSplay: number
}

export const neutralPose: Pose = {
  lean: 0,
  turn: 0,
  headPitch: 0,
  headYaw: 0,
  headRoll: 0,
  armLPitch: deg(-40),
  armLSplay: deg(8),
  armRPitch: deg(-40),
  armRSplay: deg(8),
}

/** 每种座位：腿怎么摆、坐多深、身体基础倾角；lap = 腿面（放笔记本）在身体坐标里的高度和前后位置 */
export const seatPoses: Record<
  SeatType,
  { legPitch: number; hipForward: number; hipDrop: number; sink: number; back: number; lean: number; lapY: number; lapZ: number }
> = {
  chair: { legPitch: deg(-90), hipForward: 0.24, hipDrop: 0.04, sink: 0.2, back: 0.03, lean: 0, lapY: 0.52, lapZ: 0.5 },
  // 吧凳高：腿往下垂一些，踩在脚踏圈上
  stool: { legPitch: deg(-55), hipForward: 0.18, hipDrop: 0.02, sink: 0.2, back: 0.0, lean: deg(3), lapY: 0.5, lapZ: 0.42 },
  // 沙发软：坐得更深，身体往后靠
  sofa: { legPitch: deg(-82), hipForward: 0.24, hipDrop: 0.06, sink: 0.26, back: 0.06, lean: deg(-6), lapY: 0.5, lapZ: 0.5 },
  pouf: { legPitch: deg(-75), hipForward: 0.22, hipDrop: 0.04, sink: 0.18, back: 0.0, lean: deg(2), lapY: 0.5, lapZ: 0.46 },
}

/** 每种状态的姿势：lap = 没有桌面（或桌面太远）时，desk = 前面有桌面时（只写和 lap 不同的部分） */
export const statePoses: Record<GuestState, { lap: Partial<Pose>; desk?: Partial<Pose> }> = {
  // 手放在腿上；有桌面时搭在桌沿
  idle: {
    lap: {},
    desk: { armLPitch: deg(-70), armLSplay: deg(4), armRPitch: deg(-70), armRSplay: deg(4) },
  },
  // 双手捧书在胸前，头微微低下
  reading: {
    lap: { lean: deg(5), headPitch: deg(18), armLPitch: deg(-62), armLSplay: deg(-16), armRPitch: deg(-62), armRSplay: deg(-16) },
  },
  // 手臂前伸放在键盘上
  laptop: {
    lap: { lean: deg(7), headPitch: deg(16), armLPitch: deg(-56), armLSplay: deg(-6), armRPitch: deg(-56), armRSplay: deg(-6) },
    desk: { lean: deg(5), headPitch: deg(12), armLPitch: deg(-78), armLSplay: deg(-4), armRPitch: deg(-78), armRSplay: deg(-4) },
  },
  // 手放松，身体和头转向说话的对象（转向角在运行时算）
  talking: {
    lap: { armLSplay: deg(10), armRSplay: deg(10) },
    desk: { armLPitch: deg(-62), armLSplay: deg(6), armRPitch: deg(-62), armRSplay: deg(6) },
  },
}

export const poseTiming = {
  // 状态切换：参数按指数平滑过渡，时间常数 0.12 秒 ≈ 400ms 基本到位
  smoothing: 0.12,
  // 道具出现 / 消失：时长（秒）、回弹幅度（easeOutBack 的超出系数）
  propPop: 0.35,
  propHide: 0.22,
  propOvershoot: 2.2,
  // 静坐：随机转头看看四周
  lookAround: { interval: [8, 15] as [number, number], hold: [1.5, 3] as [number, number], yaw: deg(35), pitch: deg(6) },
  // 静坐 + 点了饮料：拿起杯子喝一口再放下
  sip: {
    interval: [12, 25] as [number, number],
    duration: 3.2,
    armPitch: deg(-128),
    armSplay: deg(-22),
    headPitch: deg(-10),
  },
  // 阅读：翻页、点头
  page: { interval: [6, 10] as [number, number], duration: 0.9 },
  nod: { interval: [5, 12] as [number, number], duration: 0.7, amplitude: deg(9) },
  // 办公：打字（左右手交替的小幅上下）、伸懒腰
  typing: { frequency: 9, amplitude: deg(3.5) },
  stretch: {
    interval: [20, 40] as [number, number],
    duration: 2.4,
    lean: deg(-14),
    armPitch: deg(-165),
    armSplay: deg(22),
    headPitch: deg(-12),
  },
  // 交谈：身体和头分担转向角，最多转这么多；两人轮流说话（一个周期里前一半 A 说，后一半 B 说）
  talk: {
    maxTurn: deg(70),
    torsoShare: 0.55,
    period: 5,
    // 说话时：点头幅度、小手势（右手抬起、轻轻上下）
    nodAmplitude: deg(7),
    gesturePitch: deg(-72),
    gestureSplay: deg(18),
    gestureWave: deg(6),
    // 一群人一起时（沙发区坐满）：偶尔扭头看看群里的其他人，只转头、身体还对着说话的那个人
    glance: { interval: [5, 9] as [number, number], duration: 1.8, minOthers: 2 },
  },
}
