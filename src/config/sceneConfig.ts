// 场景所有尺寸、颜色、灯光、相机参数集中在这里。组件里不写死数值。
// 带 ?debug 打开 leva 面板时，面板的初始值也来自这里；调满意后把数值抄回这里。

const deg = (d: number) => (d * Math.PI) / 180

type Vec3 = [number, number, number]

export type TimeOfDay = 'day' | 'night'
export type BuddyPose = 'sit' | 'stand'

export const sceneConfig = {
  // ───────── 画布与渲染 ─────────
  canvas: {
    // 开了后处理后，手机上 DPR 封顶 1.5
    dprMin: 1,
    dprMax: 1.5,
  },
  shadows: {
    mapSize: 1024,
    // PCF 阴影边缘的模糊半径
    radius: 6,
    bias: -0.0005,
    normalBias: 0.02,
    // 主光阴影相机覆盖范围（世界单位，正交）
    cameraExtent: 3.5,
  },
  postprocessing: {
    // 后处理内的 MSAA 采样数（0 = 关）。手机可降到 0 或 2
    multisampling: 4,
  },

  // ───────── 风格 ─────────
  palette: {
    wall: '#F3E9DC',
    wood: '#C89F7A',
    sage: '#A8B5A0',
    terracotta: '#D98E73',
    dark: '#3B3A40',
    warmLight: '#FFD9A0',
  },
  // 所有圆角方块的统一倒角半径（世界单位）
  bevel: 0.03,
  bevelSmoothness: 4,
  material: {
    roughness: 0.85,
    metalness: 0,
  },

  // ───────── 时段 ─────────
  defaultTimeOfDay: 'day' as TimeOfDay,
  lighting: {
    day: {
      background: '#E9DFD2',
      sunColor: '#FFF4E6',
      sunIntensity: 2.4,
      ambientSky: '#FFF6EC',
      ambientGround: '#C8B49E',
      ambientIntensity: 1.1,
      lampIntensity: 0,
      bulbGlow: 0.3,
    },
    night: {
      background: '#2E2A2B',
      sunColor: '#8A8496',
      sunIntensity: 0.12,
      ambientSky: '#5C5058',
      ambientGround: '#2C2428',
      ambientIntensity: 0.4,
      lampIntensity: 3.5,
      bulbGlow: 4,
    },
    // 主光方向（相对房间中心）
    // 从相机一侧偏左上打过来，两面墙都能受光，影子落向墙角
    sunPosition: [3.5, 5, 6] as Vec3,
  },
  lamp: {
    // 吊灯聚光：朝下照桌面
    spotAngle: deg(48),
    spotPenumbra: 0.9,
    spotDecay: 2,
    spotDistance: 6,
    // 不投影的补光，照亮墙面让夜晚不至于全黑
    fillRatio: 0.25,
  },

  // ───────── 环境光遮蔽（N8AO）─────────
  ao: {
    intensity: 2.5,
    radius: 0.35,
    distanceFalloff: 1,
    quality: 'medium' as 'performance' | 'low' | 'medium' | 'high' | 'ultra',
    // 半分辨率对手机更省，但 n8ao 2.0.1 的半分辨率模式与 three r187 不兼容（会崩溃），暂时关闭
    halfRes: false,
  },

  // ───────── 相机（正交）─────────
  camera: {
    target: [0, 0.7, 0] as Vec3,
    distance: 20,
    // 极角：与竖直向上的夹角。45° 即 45° 俯视
    polarAngle: deg(45),
    // 方位角：绕 Y 轴，从 +Z 方向起算。45° 斜看进墙角
    azimuthAngle: deg(45),
    near: 0.1,
    far: 100,
    // 画面短边要能看到的世界尺寸（米）。越小越"近"
    viewSize: 5.8,
  },
  controls: {
    enablePan: false,
    enableDamping: true,
    dampingFactor: 0.08,
    rotateSpeed: 0.6,
    zoomSpeed: 0.8,
    minPolarAngle: deg(25),
    maxPolarAngle: deg(65),
    azimuthRange: deg(45),
    minZoomFactor: 0.6,
    maxZoomFactor: 2.5,
  },

  // ───────── 房间：一角 ─────────
  room: {
    // 地板 X、Z 方向尺寸，地板顶面在 y=0，墙在 -X、-Z 两侧
    size: 3.6,
    floorThickness: 0.16,
    wallHeight: 2.4,
    wallThickness: 0.14,
    plankCount: 7,
    plankGap: 0.018,
  },

  // ───────── 家具 ─────────
  table: {
    position: [0.4, 0, -0.45] as Vec3,
    topRadius: 0.48,
    topThickness: 0.06,
    height: 0.74,
    legRadius: 0.045,
    baseRadius: 0.26,
    baseThickness: 0.04,
  },
  chair: {
    // 在桌子左侧、面朝 +X，相机看到的是 3/4 正面
    position: [-0.32, 0, -0.38] as Vec3,
    rotationY: deg(90),
    seatSize: 0.42,
    seatThickness: 0.05,
    seatHeight: 0.46,
    backHeight: 0.42,
    backThickness: 0.05,
    legSize: 0.045,
  },
  pendant: {
    // 吊在桌子正上方
    hangFrom: 2.4,
    shadeBottom: 1.45,
    cordRadius: 0.008,
    shadeRadius: 0.2,
    shadeHeight: 0.18,
    bulbRadius: 0.055,
  },

  // ───────── 小人 Bar Buddy ─────────
  buddy: {
    // 造型按"全身高 2.8、身宽 1.0"的单位设计，再整体缩放到这个高度（米）
    height: 0.95,
    bodyColor: '#FFFFFF',
    eyeColor: '#141414',
    roughness: 0.75,
    // 绒面高光，模拟陶土边缘的柔光
    sheen: 0.6,
    sheenRoughness: 0.8,
    outline: false,
    outlineColor: '#141414',
    // 描边粗细（绘制缓冲区像素，不随缩放变化）。
    // 注意：drei 10.7.9 的 Outlines 里 screenspace 开关是反的——不开时才是像素宽度，所以组件里保持不开
    outlineThickness: 4,
    pose: 'sit' as BuddyPose,
    // 坐姿时相对椅面的下沉（设计单位），让屁股和腿落在座面上
    sitSink: 0.2,
    // 坐姿时相对椅子中心往后挪一点（米），坐得更深
    sitBack: 0.03,
    // 站姿时站在这里（用来对照设计稿看比例）
    standPosition: [0.75, 0, 0.6] as Vec3,
    standRotationY: deg(45),
    blink: {
      minInterval: 3,
      maxInterval: 6,
      duration: 0.15,
      closedScale: 0.1,
    },
    breath: {
      period: 3.6,
      // 身体 Y 缩放幅度
      amplitude: 0.022,
      // 头相对身体的滞后（秒）
      headLag: 0.18,
    },
  },
} as const

// 小人造型（设计单位：全身高 ≈ 2.8，身宽 ≈ 1.0）
export const buddyShape = {
  designHeight: 2.8,
  // 身体旋转体轮廓 [半径, 高度]，自下而上，会被平滑成曲线
  bodyProfile: [
    [0.0, 0.3],
    [0.26, 0.31],
    [0.42, 0.4],
    [0.48, 0.58],
    [0.47, 0.82],
    [0.42, 1.06],
    [0.35, 1.3],
    [0.28, 1.48],
    [0.17, 1.58],
    [0.0, 1.6],
  ] as [number, number][],
  neck: { radius: 0.19, bottom: 1.5, top: 1.66 },
  head: { radius: 0.56, centerY: 2.2, squashY: 0.95 },
  leg: { radius: 0.17, length: 0.2, offsetX: 0.19, hipY: 0.36 },
  arm: {
    radius: 0.125,
    length: 0.6,
    shoulderX: 0.3,
    shoulderY: 1.36,
    // 站姿外张角度
    splay: deg(9),
  },
  eye: {
    // 椭球半径：宽、高、厚
    size: [0.06, 0.1, 0.03] as Vec3,
    // 眼睛在头上的位置：水平夹角（左右各一）、垂直夹角（负 = 偏下）
    yaw: deg(28),
    pitch: deg(-4),
    // 沿法线嵌入头部的深度
    inset: 0.012,
  },
  sit: {
    // 坐姿：腿向前伸平，手臂向前搭在腿上
    legPitch: deg(-90),
    // 腿的髋部前移、略降，让短腿从肚子下方伸出来
    hipForward: 0.24,
    hipDrop: 0.04,
    armPitch: deg(-40),
    armSplay: deg(8),
  },
} as const
