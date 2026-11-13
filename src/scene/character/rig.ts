import { MathUtils, Matrix4, Object3D, Quaternion, Vector3 } from 'three'
import { buddyShape as S, sceneConfig } from '../../config/sceneConfig'
import type { Seat } from '../../config/seatConfig'
import {
  neutralPose,
  poseTiming as T,
  seatPoses,
  statePoses,
  type GuestState,
  type Pose,
} from '../../config/poses'
import { blushing, eyesOpen, expressionTiming as X, faceAtlas, pickWeighted, type Expression } from '../../config/expressions'
import { seededRandom } from '../primitives/canvasTexture'
import { menuItems, type MenuId } from '../../config/menu'
import { BODY_BOTTOM, EYE_Y } from './parts'

// 一个小人的"骨架"：一组不显示的层级节点（身体 → 头、身体 → 手臂、髋 → 腿），姿势靠旋转这些节点来摆。
// 每帧算好节点的世界矩阵，再写进所有小人共用的实例化网格（见 Guests.tsx）。

const B = sceneConfig.buddy
const P = B.props
export const BUDDY_SCALE = B.height / S.designHeight
const up = new Vector3(0, 1, 0)
const ease = (x: number) => x * x * (3 - 2 * x)
/** 回弹出现：0 → 1，中途略微超过 1 */
function easeOutBack(x: number) {
  const c = T.propOvershoot
  const t = x - 1
  return 1 + (c + 1) * t * t * t + c * t * t
}

/** 一个道具的出现 / 消失进度 */
class Pop {
  t = 0
  update(show: boolean, dt: number) {
    this.t = MathUtils.clamp(this.t + (show ? dt / T.propPop : -dt / T.propHide), 0, 1)
  }
  /** 显示用的缩放：出现时回弹，消失时直接缩小 */
  get scale() {
    return this.t <= 0 ? 0 : this.t >= 1 ? 1 : easeOutBack(this.t)
  }
}

/** 一段定时动作：每隔 interval（随机）触发一次，持续 duration；weight 是 0 → 1 → 0 的包络 */
class Beat {
  next: number
  start = -1e9
  private rand: () => number
  private interval: [number, number]
  duration: number
  constructor(rand: () => number, interval: [number, number], duration: number, now: number) {
    this.rand = rand
    this.interval = interval
    this.duration = duration
    this.next = now + this.span() * (0.3 + rand())
  }
  private span() {
    return this.interval[0] + this.rand() * (this.interval[1] - this.interval[0])
  }
  /** 推进时间；enabled 为 false 时不触发新的一次 */
  tick(now: number, enabled: boolean) {
    if (enabled && now >= this.next && now - this.start > this.duration) {
      this.start = now
      this.next = now + this.duration + this.span()
    }
  }
  /** 当前这一次的进度 0..1（不在进行中为 -1） */
  progress(now: number) {
    const p = (now - this.start) / this.duration
    return p >= 0 && p <= 1 ? p : -1
  }
  /** 平滑的包络：前 25% 升起、最后 25% 落下 */
  weight(now: number) {
    const p = this.progress(now)
    if (p < 0) return 0
    return ease(Math.min(1, p / 0.25, (1 - p) / 0.25))
  }
}

export type RigInput = {
  seat: Seat
  state: GuestState
  /** 桌上的饮品 / 小食（放在 seat.table） */
  drink: MenuId | null
  food: MenuId | null
  /** 交谈对象的座位（没有就是 null） */
  partner: Seat | null
  /** 手动指定的表情（?debug / setEmote）；null = 按自动规则 */
  emote: Expression | null
  /** 同一群里其他有人的座位（不含交谈对象）：人够多时偶尔扭头看看他们 */
  others: Seat[]
}

export class Rig {
  readonly root = new Object3D()
  readonly hips = [new Object3D(), new Object3D()]
  readonly torso = new Object3D()
  readonly breath = new Object3D()
  readonly body = new Object3D()
  readonly shoulders = [new Object3D(), new Object3D()]
  readonly head = new Object3D()
  readonly eyes = new Object3D()
  // 道具挂点
  readonly book = new Object3D()
  readonly bookHalves = [new Object3D(), new Object3D()]
  readonly page = new Object3D()
  readonly lapAnchor = new Object3D()
  readonly hand = new Object3D()
  readonly laptop = new Object3D()
  readonly lid = new Object3D()

  readonly pops = { book: new Pop(), laptop: new Pop(), drink: new Pop(), food: new Pop(), bubble: new Pop() }
  /** 正在显示的饮品 / 小食（换了一样会从头弹出来） */
  shownDrink: MenuId | null = null
  shownFood: MenuId | null = null
  private pose: Pose = { ...neutralPose }
  private rand: () => number
  private phase: number
  private blinkAt: number
  private look: Beat
  private lookTarget = { yaw: 0, pitch: 0 }
  private flip: Beat
  private nod: Beat
  private stretch: Beat
  private glance: Beat
  private glanceAt: Seat | null = null
  private glanceStart = -1
  private first = true
  private first2 = true
  // 表情
  private expr: Expression = 'default'
  /** 切换表情的过渡：0 = 没在切换，1 = 正在闭眼，2 = 正在睁眼 */
  private switchPhase = 0
  private switchT = 0
  private greetAt = -1e9
  private flash: Record<'reading' | 'laptop', Beat>
  private talkSlot = -1
  private talkExpr: Expression = 'happy'
  /** 阅读 / 办公：这一次"闪一下"挑中的表情 */
  private flashExpr: Expression = 'happy'
  private flashStart = -1
  /** 本帧的眼睛 / 腮红在图集里是第几格 */
  eyeCell: number = faceAtlas.cells.default
  blushCell: number = faceAtlas.cells.none
  /** 本帧算好的：杯子、笔记本、气泡的世界位置（道具不跟着手臂转，保持竖直） */
  readonly drinkMatrix = new Matrix4()
  readonly foodMatrix = new Matrix4()
  readonly bubbleMatrix = new Matrix4()
  readonly tagMatrix = new Matrix4()
  /** 头顶（世界坐标），头顶的音符等挂件用 */
  readonly headTop = new Vector3()
  speaking = false

  constructor(seed: number, now: number) {
    this.rand = seededRandom(seed * 7717 + 3)
    this.phase = this.rand() * Math.PI * 2
    this.blinkAt = now + this.rand() * B.blink.maxInterval
    this.look = new Beat(this.rand, T.lookAround.interval, 2.4 + T.lookAround.hold[1], now)
    this.flip = new Beat(this.rand, T.page.interval, T.page.duration, now)
    this.nod = new Beat(this.rand, T.nod.interval, T.nod.duration, now)
    this.stretch = new Beat(this.rand, T.stretch.interval, T.stretch.duration, now)
    this.glance = new Beat(this.rand, T.talk.glance.interval, T.talk.glance.duration, now)
    this.flash = {
      reading: new Beat(this.rand, X.reading.interval, X.reading.duration, now),
      laptop: new Beat(this.rand, X.laptop.interval, X.laptop.duration, now),
    }

    // 层级：root → 髋（腿）；root → 身体支点 → 呼吸 → 身体 / 肩（手臂 → 手）；身体支点 → 头 → 眼睛；身体支点 → 书
    const r = this.root
    r.scale.setScalar(BUDDY_SCALE)
    this.hips.forEach((h) => r.add(h))
    r.add(this.torso)
    this.torso.position.y = BODY_BOTTOM
    this.torso.add(this.breath)
    this.breath.add(this.body)
    this.body.position.y = -BODY_BOTTOM
    this.shoulders.forEach((s, i) => {
      const side = i === 0 ? -1 : 1
      s.position.set(side * S.arm.shoulderX, S.arm.shoulderY - BODY_BOTTOM, 0)
      this.breath.add(s)
    })
    // 右手（side -1）手掌的位置：手臂末端
    this.hand.position.set(0, -(S.arm.length + S.arm.radius * 0.6), S.arm.radius * 0.6)
    this.shoulders[0].add(this.hand)
    this.torso.add(this.head)
    this.head.position.y = S.head.centerY - BODY_BOTTOM
    this.head.add(this.eyes)
    this.eyes.position.y = EYE_Y
    // 书：在身体前方，往脸的方向倾斜；书的几何体是米，所以抵消掉整体缩放
    this.torso.add(this.book)
    this.book.position.set(P.bookAt[0], P.bookAt[1] - BODY_BOTTOM, P.bookAt[2])
    this.book.rotation.x = P.bookTilt
    this.book.scale.setScalar(1 / BUDDY_SCALE)
    this.bookHalves[1].rotation.y = Math.PI
    this.bookHalves.forEach((h) => this.book.add(h))
    this.book.add(this.page)
    // 腿面：没有桌面时笔记本放这里
    r.add(this.lapAnchor)
    // 笔记本自己在世界坐标（米），不挂在小人身上
    this.laptop.add(this.lid)
  }

  /** 点的东西：要显示的换了（替换同类）先把旧的瞬间收掉，再让新的弹出来 */
  private updateOrder(kind: 'drink' | 'food', want: MenuId | null, dt: number) {
    const pop = this.pops[kind]
    const shown = kind === 'drink' ? this.shownDrink : this.shownFood
    if (want && want !== shown) {
      pop.t = 0
      if (kind === 'drink') this.shownDrink = want
      else this.shownFood = want
    }
    pop.update(!!want, dt)
    if (!want && pop.t <= 0) {
      if (kind === 'drink') this.shownDrink = null
      else this.shownFood = null
    }
  }

  /** 邻座有人坐下：先惊讶、再开心，像在打招呼 */
  greet(now: number) {
    this.greetAt = now
  }

  /** 按优先级决定现在该是什么表情：手动 > 打招呼 > 状态规则 > 默认 */
  private desiredExpression(input: RigInput, now: number): Expression {
    if (input.emote) return input.emote
    const g = now - this.greetAt
    if (g >= 0 && g < X.greet.surprised) return 'surprised'
    if (g >= X.greet.surprised && g < X.greet.surprised + X.greet.happy) return 'happy'
    switch (input.state) {
      case 'idle':
        return 'default'
      case 'reading':
      case 'laptop': {
        const rule = X[input.state]
        const beat = this.flash[input.state]
        beat.tick(now, true)
        if (beat.progress(now) < 0) return rule.base
        // 每次新的一闪按权重挑一个表情
        if (beat.start !== this.flashStart) {
          this.flashStart = beat.start
          this.flashExpr = pickWeighted(rule.flashes, this.rand())
        }
        return this.flashExpr
      }
      case 'talking': {
        // 跟着气泡轮换：每轮换一次就重新挑一个
        if (!input.partner) return 'default'
        const offset = input.seat.id < input.partner.id ? 0 : 0.5
        const slot = Math.floor((now / T.talk.period + offset) * 2)
        if (slot !== this.talkSlot) {
          this.talkSlot = slot
          this.talkExpr = pickWeighted(X.talking.choices, this.rand())
        }
        return this.talkExpr
      }
    }
  }

  /** 推进一帧：算目标姿势 → 平滑过渡 → 叠加快速的小动作 → 更新所有节点和道具 */
  update(input: RigInput, now: number, dt: number, cameraQuaternion: Quaternion) {
    const { seat, state, partner } = input
    const sp = seatPoses[seat.pose]
    const desk = seat.desk

    // ── 摆放：坐在座位上，往后挪一点、往下沉一点 ──
    const back = new Vector3(0, 0, -sp.back).applyAxisAngle(up, seat.rotationY)
    this.root.position.set(seat.position[0] + back.x, seat.position[1] - sp.sink * BUDDY_SCALE, seat.position[2] + back.z)
    this.root.rotation.y = seat.rotationY
    this.hips.forEach((h, i) => {
      const side = i === 0 ? -1 : 1
      h.position.set(side * S.leg.offsetX, S.leg.hipY - sp.hipDrop, sp.hipForward)
      h.rotation.x = sp.legPitch
    })

    // ── 目标姿势：中性姿势 + 座位 + 状态（有桌面用桌面版） ──
    const sp2 = statePoses[state]
    const target: Pose = { ...neutralPose, ...sp2.lap, ...(desk && sp2.desk ? sp2.desk : {}) }
    target.lean += sp.lean

    // 静坐：偶尔慢慢转头看看四周
    this.look.tick(now, state === 'idle')
    if (this.look.progress(now) >= 0 && this.look.progress(now) < 0.02) {
      this.lookTarget.yaw = (this.rand() * 2 - 1) * T.lookAround.yaw
      this.lookTarget.pitch = (this.rand() * 2 - 1) * T.lookAround.pitch
    }
    const lookW = state === 'idle' ? this.look.weight(now) : 0
    target.headYaw += this.lookTarget.yaw * lookW
    target.headPitch += this.lookTarget.pitch * lookW


    // 办公：偶尔往后靠伸个懒腰
    this.stretch.tick(now, state === 'laptop')
    const stretchW = state === 'laptop' ? this.stretch.weight(now) : 0
    target.lean = MathUtils.lerp(target.lean, T.stretch.lean, stretchW)
    target.headPitch = MathUtils.lerp(target.headPitch, T.stretch.headPitch, stretchW)
    for (const k of ['L', 'R'] as const) {
      target[`arm${k}Pitch`] = MathUtils.lerp(target[`arm${k}Pitch`], T.stretch.armPitch, stretchW)
      target[`arm${k}Splay`] = MathUtils.lerp(target[`arm${k}Splay`], T.stretch.armSplay, stretchW)
    }

    // 交谈：身体和头转向对方；两人轮流说话（座位 id 排在前面的先说）
    this.speaking = false
    /** 某个座位在自己座位坐标里的方向角（0 = 正前方） */
    const angleTo = (other: Seat) => {
      const v = new Vector3(other.position[0] - seat.position[0], 0, other.position[2] - seat.position[2]).applyAxisAngle(
        up,
        -seat.rotationY,
      )
      return Math.atan2(v.x, v.z)
    }
    if (state === 'talking' && partner) {
      const ang = MathUtils.clamp(angleTo(partner), -T.talk.maxTurn, T.talk.maxTurn)
      target.turn = ang * T.talk.torsoShare
      target.headYaw += ang * (1 - T.talk.torsoShare)
      // 群里人够多时：偶尔扭头看一眼别人（身体不动）
      const many = input.others.length >= T.talk.glance.minOthers
      this.glance.tick(now, many)
      if (many && this.glance.progress(now) >= 0) {
        if (this.glance.start !== this.glanceStart) {
          this.glanceStart = this.glance.start
          this.glanceAt = input.others[Math.floor(this.rand() * input.others.length)]
        }
        if (this.glanceAt) {
          const look = MathUtils.clamp(angleTo(this.glanceAt) - target.turn, -T.talk.maxTurn, T.talk.maxTurn)
          target.headYaw = MathUtils.lerp(target.headYaw, look, this.glance.weight(now))
        }
      }
      const offset = seat.id < partner.id ? 0 : 0.5
      this.speaking = ((now / T.talk.period + offset) % 1) < 0.5
      if (this.speaking) {
        target.armRPitch = T.talk.gesturePitch
        target.armRSplay = T.talk.gestureSplay
      }
    }

    // ── 平滑过渡（状态切换约 400ms 到位） ──
    const k = this.first ? 1 : 1 - Math.exp(-dt / T.smoothing)
    this.first = false
    const pose = this.pose
    for (const key of Object.keys(pose) as (keyof Pose)[]) pose[key] += (target[key] - pose[key]) * k

    // ── 叠加快速的小动作（不平滑） ──
    let headPitch = pose.headPitch
    let armL = pose.armLPitch
    let armR = pose.armRPitch
    // 阅读 / 交谈里听对方说话时：偶尔点头
    this.nod.tick(now, state === 'reading' || (state === 'talking' && !this.speaking))
    const nodP = this.nod.progress(now)
    if (nodP >= 0 && (state === 'reading' || state === 'talking')) headPitch += Math.sin(nodP * Math.PI * 2) * T.nod.amplitude
    if (state === 'laptop') {
      // 打字：左右手交替上下，伸懒腰时停
      const w = T.typing.frequency * now + this.phase
      armL += Math.sin(w) * T.typing.amplitude * (1 - stretchW)
      armR += Math.sin(w + Math.PI) * T.typing.amplitude * (1 - stretchW)
    }
    if (this.speaking) {
      headPitch += Math.sin(now * 5 + this.phase) * T.talk.nodAmplitude * 0.5
      armR += Math.sin(now * 4 + this.phase) * T.talk.gestureWave
    }

    // ── 写入节点 ──
    this.torso.rotation.set(pose.lean, pose.turn, 0)
    const br = B.breath
    const breath = Math.sin((2 * Math.PI * now) / br.period + this.phase)
    this.breath.scale.y = 1 + br.amplitude * breath
    this.head.position.y = S.head.centerY - BODY_BOTTOM + (S.neck.top - BODY_BOTTOM) * br.amplitude * Math.sin((2 * Math.PI * (now - br.headLag)) / br.period + this.phase)
    this.head.rotation.set(headPitch, pose.headYaw, pose.headRoll)
    this.shoulders[0].rotation.set(armR, 0, -pose.armRSplay)
    this.shoulders[1].rotation.set(armL, 0, pose.armLSplay)

    // 眨眼：每人自己的节奏
    if (now >= this.blinkAt + B.blink.duration) {
      this.blinkAt = now + B.blink.minInterval + this.rand() * (B.blink.maxInterval - B.blink.minInterval)
    }
    // 自然眨眼（闭着眼的表情不眨，见下面）
    let blink = now >= this.blinkAt && now < this.blinkAt + B.blink.duration ? B.blink.closedScale : 1
    let eyeScale = 1

    // 表情：要变的时候先快速闭眼，闭上的那一刻换，再睁开
    const want = this.desiredExpression(input, now)
    if (this.first2) {
      this.expr = want
      this.first2 = false
    } else if (this.switchPhase === 0 && want !== this.expr) {
      this.switchPhase = 1
      this.switchT = 0
    }
    if (this.switchPhase === 1) {
      this.switchT += dt
      const p = Math.min(1, this.switchT / X.switchClose)
      eyeScale = MathUtils.lerp(1, B.blink.closedScale, p)
      if (p >= 1) {
        this.expr = want
        this.switchPhase = 2
        this.switchT = 0
      }
    } else if (this.switchPhase === 2) {
      this.switchT += dt
      const p = Math.min(1, this.switchT / X.switchOpen)
      eyeScale = MathUtils.lerp(B.blink.closedScale, 1, p)
      if (p >= 1) this.switchPhase = 0
    }
    // happy / squint / focus 本身是闭着眼的弧线：不眨眼，切换时也不压扁（只按节奏换图）
    if (!eyesOpen[this.expr]) {
      eyeScale = 1
      blink = 1
    }
    this.eyes.scale.y = Math.min(eyeScale, blink)
    this.eyeCell = faceAtlas.cells[this.expr]
    this.blushCell = blushing[this.expr] ? faceAtlas.cells.blush : faceAtlas.cells.none

    // ── 道具 ──
    this.pops.book.update(state === 'reading', dt)
    this.pops.laptop.update(state === 'laptop', dt)
    // 点的东西：换了一样就从头弹出来；拿走（null）时缩小消失
    this.updateOrder('drink', input.drink, dt)
    this.updateOrder('food', input.food, dt)
    this.pops.bubble.update(this.speaking, dt)

    // 书：翻页（一页绕书脊翻过去）
    this.flip.tick(now, state === 'reading')
    const fp = this.flip.progress(now)
    this.page.rotation.z = fp < 0 ? 0 : ease(fp) * Math.PI
    this.book.scale.setScalar(this.pops.book.scale / BUDDY_SCALE)

    // 笔记本：有桌面放桌上，没有就放腿上；+Z 朝向使用的人
    this.lapAnchor.position.set(0, seatPoses[seat.pose].lapY, seatPoses[seat.pose].lapZ)
    this.root.updateMatrixWorld(true)
    const laptopPos = new Vector3()
    if (desk) laptopPos.set(desk[0], desk[1], desk[2])
    else this.lapAnchor.getWorldPosition(laptopPos)
    this.laptop.position.copy(laptopPos)
    this.laptop.rotation.set(0, seat.rotationY + Math.PI, 0)
    this.laptop.scale.setScalar(this.pops.laptop.scale)
    this.lid.position.set(0, P.laptop.baseThickness, -P.laptop.depth / 2)
    this.lid.rotation.x = -P.laptop.openAngle
    this.laptop.updateMatrixWorld(true)

    // 饮品放右手边、小食放左手边；图片底边贴在桌面上，整张正对镜头（俯视时以底边为轴往后仰，不会被压扁）
    const table = seat.table
    if (table) {
      const O = sceneConfig.order
      const face = cameraQuaternion
      const right = new Vector3(-1, 0, 0).applyAxisAngle(up, seat.rotationY)
      const toSeat = new Vector3(0, 0, -1).applyAxisAngle(up, seat.rotationY).multiplyScalar(O.towardSeat)
      const place = (m: Matrix4, id: MenuId | null, pop: Pop, side: number, offset: number) => {
        const size = id ? menuItems[id].size * pop.scale : 0
        const p = new Vector3(table[0], table[1] - O.sink, table[2]).addScaledVector(right, side * offset).add(toSeat)
        m.compose(p, face, new Vector3(size, size, size))
      }
      place(this.drinkMatrix, this.shownDrink, this.pops.drink, 1, O.drinkOffset)
      place(this.foodMatrix, this.shownFood, this.pops.food, -1, O.foodOffset)
    }

    // 气泡：头顶上方，始终正对镜头
    const headTop = this.head.getWorldPosition(new Vector3())
    headTop.y += S.head.radius * S.head.squashY * BUDDY_SCALE
    this.headTop.copy(headTop)
    headTop.y += P.bubble.lift
    this.bubbleMatrix.compose(headTop, cameraQuaternion, new Vector3().setScalar(this.pops.bubble.scale))
    // 称号标签：再高一点（只有自己的小人用）
    headTop.y += sceneConfig.titleTag.lift - P.bubble.lift
    this.tagMatrix.compose(headTop, cameraQuaternion, new Vector3(1, 1, 1))
  }
}
