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
    // 主光阴影相机覆盖范围（世界单位，正交），要盖住整个房间
    cameraExtent: 5.8,
  },
  postprocessing: {
    // 后处理内的 MSAA 采样数（0 = 关）。手机可降到 0 或 2
    multisampling: 4,
  },
  // Bloom：只让自发光的表面发光。被主光照亮的浅色表面在 HDR 里能到 2.5 左右，
  // 所以阈值设在 3，自发光物件的强度要高于它（见 scene-style）
  bloom: {
    intensity: 0.8,
    luminanceThreshold: 3,
    luminanceSmoothing: 0.2,
    radius: 0.7,
  },
  // 程序化环境反射（只渲染一次），主要给金属用
  environment: {
    resolution: 64,
    // 环境底色：没有柔光板的方向反射这个颜色，避免金属发黑
    baseColor: '#8C8379',
    // 柔光板：位置、尺寸 [宽, 高]、强度
    lightformers: [
      { position: [0, 5, 0] as Vec3, scale: [10, 10] as [number, number], intensity: 1.2, rotationX: Math.PI / 2 },
      { position: [5, 2, 3] as Vec3, scale: [6, 3] as [number, number], intensity: 1.6, rotationX: 0 },
      { position: [-5, 2, -2] as Vec3, scale: [6, 3] as [number, number], intensity: 0.6, rotationX: 0 },
    ],
  },

  // ───────── 风格 ─────────
  palette: {
    wall: '#F3E9DC',
    wood: '#C89F7A',
    sage: '#A8B5A0',
    terracotta: '#D98E73',
    dark: '#3B3A40',
    warmLight: '#FFD9A0',
    concrete: '#A49B94',
    slate: '#4A4757',
    baseboard: '#5A5560',
    cream: '#EFE4CF',
    navy: '#2E3A5E',
    rust: '#C4573A',
    blush: '#F2C9C0',
    pendantGreen: '#2F5E3E',
    steel: '#C8CCD0',
    brass: '#C9A15A',
  },
  // 统一倒角半径（世界单位），分三档：大件家具 / 小件 / 细杆（乘以 bevel）
  bevel: 0.03,
  bevelTiers: { large: 1, small: 0.5, rod: 0.25 },
  bevelSmoothness: 4,
  // 几何细分按档位分级：小件和细杆在这个视距下看不出差别，少分段能省很多面（手机）
  detail: {
    boxSmoothness: { large: 4, small: 3, rod: 2 },
    cylinderSegments: { large: 48, small: 32, rod: 16 },
    cylinderArcSteps: { large: 6, small: 3, rod: 2 },
    // 旋转体圆周分段：默认 / 瓶子杯子等小物件
    latheSegments: 32,
    smallLatheSegments: 16,
  },
  material: {
    roughness: 0.85,
    metalness: 0,
    // 哑光表面吃一点环境反射，补一层柔光；0 = 完全不受环境影响
    envMapIntensity: 0.25,
    // 实例化物件的基础色（实例颜色会乘上它，所以必须是白色）
    instanceBase: '#FFFFFF',
  },
  // 自发光分组强度：最终强度 = 分组强度 × 当前时段的 glow 倍率。夜晚要高于 Bloom 阈值才有光晕
  emissive: {
    bulb: 8,
    ledStrip: 6,
    screen: 2,
    // 灯具下方的假光斑（叠加混合的径向渐变），不是真实光源
    pool: 0.55,
  },
  // 光斑贴图：径向渐变，启动时生成一次
  lightPool: {
    textureSize: 128,
    // 渐变中间一档的位置和亮度
    midStop: 0.35,
    midAlpha: 0.45,
  },
  // 金属白名单（不锈钢 / 镀铬 / 黄铜）
  metal: {
    roughness: 0.35,
    metalness: 1,
    envMapIntensity: 1,
  },
  // 玻璃 / 亚克力：半透明，不用折射
  glass: {
    opacity: 0.28,
    roughness: 0.1,
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
      // 所有自发光物件的整体倍率（白天几乎关闭）
      glow: 0.15,
    },
    night: {
      background: '#2E2A2B',
      sunColor: '#8A8496',
      sunIntensity: 2,
      ambientSky: '#5C5058',
      ambientGround: '#2C2428',
      ambientIntensity: 3,
      glow: 1,
    },
    // 主光方向（相对房间中心）
    // 从相机一侧偏左上打过来，两面墙都能受光，影子落向墙角
    sunPosition: [3.5, 5, 6] as Vec3,
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
  // 角度一律用"度"，方便在 leva 里调；组件里再换算成弧度
  camera: {
    // 默认焦点（全景时看向这里）
    target: [0, 0.6, 0] as Vec3,
    // 正交相机离焦点的距离，只影响裁剪，不影响画面大小
    distance: 20,
    near: 0.1,
    far: 100,
    // 默认视角：方位角从 +Z 起绕 Y 轴；45° 正对墙角
    defaultAzimuthDeg: 45,
    // 默认俯角（与地面夹角）
    defaultDepressionDeg: 45,
    // 画面短边能看到的世界尺寸（米）：全景 = 最远，近景 = 最近（大约一张桌子）
    fullViewSize: 11,
    closeViewSize: 1.5,
  },
  controls: {
    // 水平方向：默认方位角左右各转多少度（墙在 -X/-Z，超过 45° 会看到墙背面）
    azimuthRangeDeg: 35,
    // 俯角范围（与地面夹角）：不能平视，也不能正俯视
    minDepressionDeg: 25,
    maxDepressionDeg: 60,
    // 阻尼：松手后缓停的时间 / 拖动中跟随的时间（秒）
    smoothTime: 0.3,
    draggingSmoothTime: 0.12,
    rotateSpeed: 0.6,
    truckSpeed: 1,
    dollySpeed: 0.5,
    // 平移边界：焦点限制在地板范围内，并随缩放收放（全景时为 0，不能平移）
    // 地板一半尺寸乘这个系数，留一点余量让边缘物件也能拉到画面中间
    boundaryScale: 1,
  },

  // ───────── 交互 ─────────
  interaction: {
    // 指针移动不超过这个像素数才算"点按"，否则算拖动
    tapThreshold: 6,
    // 双击：两次点按的最大间隔（毫秒）与最大距离（像素）
    doubleTapMs: 300,
    doubleTapDistance: 30,
  },

  // ───────── 2D 界面 ─────────
  ui: {
    resetButton: {
      size: 44,
      iconSize: 20,
      margin: 16,
      background: 'rgba(59, 58, 64, 0.72)',
      color: '#F3E9DC',
      shadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
    },
  },

  // ───────── 房间 ─────────
  // 地面顶面在 y=0，中心在原点。后墙在 -Z，左墙在 -X
  room: {
    width: 8,
    depth: 6.4,
    floorThickness: 0.16,
    wallHeight: 2.6,
    wallThickness: 0.14,
    // 墙顶深色压边
    trimHeight: 0.06,
    trimOverhang: 0.012,
    // 踢脚线
    baseboardHeight: 0.08,
    baseboardThickness: 0.02,
  },
  door: {
    width: 0.92,
    height: 2.06,
    thickness: 0.05,
    portholeRadius: 0.15,
    portholeY: 1.48,
    portholeRing: 0.018,
    handleX: -0.34,
    handleY: 1.0,
    // 门把：圆底座 + 立杆 + 横杆
    handleRoseRadius: 0.025,
    handleRoseDepth: 0.012,
    handleStemLength: 0.036,
    handleBarRadius: 0.009,
    handleBarLength: 0.1,
    // 贴在门面上的零件离门面的距离，防止闪烁
    surfaceOffset: 0.002,
  },

  // ───────── 餐桌区 ─────────
  diningTable: {
    topSize: 0.72,
    topThickness: 0.04,
    height: 0.74,
    columnRadius: 0.035,
    baseRadius: 0.24,
    baseThickness: 0.03,
    // 立柱上下各插进台面/底盘一点，避免接缝
    columnOverlap: 0.005,
  },
  shellChair: {
    seatWidth: 0.44,
    seatDepth: 0.42,
    shellThickness: 0.03,
    seatHeight: 0.46,
    backHeight: 0.36,
    // 靠背后仰角度与弯曲半径（越小越弯）
    backTilt: deg(10),
    backBendRadius: 0.32,
    legRadius: 0.011,
    // 腿向外张开的水平偏移
    legSplay: 0.03,
    legInset: 0.05,
    seatCornerRadius: 0.09,
    backCornerRadius: 0.12,
    // 曲面细分：越大越圆滑
    bendSegments: 16,
  },
  roundRug: {
    radius: 0.85,
    thickness: 0.012,
  },


  // ───────── 吧台区 ─────────
  // 以下坐标都是各物件的局部坐标（原点在物件底面中心，+Z 朝向房间），摆放位置在 layout.json
  bar: {
    // 后操作台（连同台面上的咖啡区一起作为一个物件）：背面贴墙
    backCounter: {
      width: 3.6,
      depth: 0.6,
      height: 0.9,
      topThickness: 0.04,
    },
    // 水槽：深色薄板嵌在台面上，离台面前沿 frontMargin
    sink: { x: -1.4, width: 0.42, depth: 0.34, plateThickness: 0.012, frontMargin: 0.05 },
    // 水龙头：从离墙 backOffset 处立起，弯向前方
    faucet: { x: -1.4, height: 0.3, reach: 0.17, radius: 0.012, backOffset: 0.1 },
    // 浮板置物架（墙面物件）：原点在墙面、板面高度处
    shelf: {
      depth: 0.2,
      thickness: 0.035,
      defaultWidth: 1.2,
    },
    // 杯子轮廓 [半径, 高度]，自下而上，开口朝上（外壁 → 杯口 → 内壁）；perMeter = 每米板长放几个
    mug: {
      perMeter: 6.4,
      colors: ['dark'] as const,
      profile: [[0.001, 0], [0.038, 0], [0.041, 0.006], [0.041, 0.09], [0.036, 0.09], [0.034, 0.012], [0.001, 0.012]] as [number, number][],
      handleRadius: 0.024,
      handleTube: 0.007,
    },
    cup: {
      perMeter: 6.4,
      colors: ['cream'] as const,
      profile: [[0.001, 0], [0.028, 0], [0.036, 0.008], [0.04, 0.06], [0.035, 0.06], [0.03, 0.01], [0.001, 0.01]] as [number, number][],
      handleRadius: 0.018,
      handleTube: 0.006,
    },
    // 酒瓶：3 种瓶型轮廓轮流使用；颜色从 props.seed 开始轮换，两层不会一模一样
    bottles: {
      perMeter: 7.4,
      colors: ['rust', 'pendantGreen', 'wood', 'navy', 'terracotta', 'brass', 'dark'] as const,
      profiles: [
        [[0.001, 0], [0.034, 0], [0.037, 0.01], [0.037, 0.17], [0.03, 0.2], [0.013, 0.23], [0.012, 0.28], [0.001, 0.285]],
        [[0.001, 0], [0.04, 0], [0.042, 0.012], [0.042, 0.15], [0.035, 0.17], [0.015, 0.19], [0.014, 0.24], [0.001, 0.245]],
        [[0.001, 0], [0.029, 0], [0.031, 0.01], [0.031, 0.22], [0.021, 0.25], [0.01, 0.27], [0.01, 0.31], [0.001, 0.315]],
      ] as [number, number][][],
    },
    espresso: {
      x: -0.6,
      size: [0.56, 0.34, 0.4] as Vec3,
      panelHeight: 0.12,
      panelDepth: 0.02,
      groupHeadRadius: 0.034,
      groupHeadHeight: 0.05,
      groupHeadSpacing: 0.2,
      // 冲煮头离机身底部的高度
      groupHeadY: 0.14,
      trayHeight: 0.03,
      trayDepth: 0.14,
      // 前面板离顶部、接水盘缩进机身的距离
      panelInset: 0.02,
      trayTuck: 0.02,
      topCupCount: 4,
      topCupHeight: 0.05,
    },
    grinders: {
      xs: [0.02, 0.28],
      baseSize: [0.15, 0.22, 0.18] as Vec3,
      hopper: [[0.001, 0], [0.04, 0], [0.065, 0.1], [0.07, 0.13], [0.001, 0.135]] as [number, number][],
    },
    pourOver: {
      x: 0.65,
      kettle: [[0.001, 0], [0.065, 0], [0.07, 0.01], [0.068, 0.1], [0.045, 0.13], [0.02, 0.14], [0.001, 0.145]] as [number, number][],
      spoutRadius: 0.008,
      spoutLength: 0.13,
      // 壶嘴从壶身高度的这个比例处伸出，向上倾斜的角度
      spoutHeightRatio: 0.75,
      spoutAngle: deg(60),
      dripperX: 0.18,
      server: [[0.001, 0], [0.05, 0], [0.055, 0.1], [0.045, 0.12], [0.001, 0.12]] as [number, number][],
      dripper: [[0.001, 0], [0.025, 0], [0.06, 0.07], [0.055, 0.075], [0.001, 0.02]] as [number, number][],
    },
    jars: { xFrom: 1.05, count: 4, spacing: 0.17, radius: 0.045, heights: [0.14, 0.11, 0.16, 0.1] },

    // L 形吧台：原点在长边正面的中点。长边沿 X（-length/2 ~ length/2），
    // 右端圆角折回 -Z 方向（后墙方向）一直到 -returnDepth，左端开口
    counter: {
      length: 2.8,
      depth: 0.55,
      returnDepth: 0.8,
      cornerRadius: 0.35,
      height: 1.05,
      topThickness: 0.05,
      overhang: 0.04,
    },
    // 灯带贴着台面出檐外沿的下方，从斜上方也看得到
    ledStrip: { radius: 0.011, belowTop: 0.016, outset: 1 },
    pos: {
      x: -1.1,
      baseSize: [0.18, 0.06, 0.16] as Vec3,
      screenSize: [0.26, 0.18, 0.02] as Vec3,
      screenTilt: deg(20),
      readerSize: [0.07, 0.03, 0.12] as Vec3,
      readerOffset: 0.24,
      napkinSize: [0.12, 0.08, 0.07] as Vec3,
      napkinOffset: 0.42,
    },
    shakers: {
      xs: [-0.05, 0.07, 0.19],
      profile: [[0.001, 0], [0.03, 0], [0.034, 0.01], [0.04, 0.12], [0.036, 0.14], [0.026, 0.16], [0.012, 0.18], [0.001, 0.182]] as [number, number][],
      bottleX: 0.32,
    },
    stools: {
      seatHeight: 0.75,
      cushionRadius: 0.18,
      cushionThickness: 0.07,
      columnRadius: 0.028,
      base: [[0.001, 0], [0.2, 0], [0.2, 0.015], [0.14, 0.04], [0.04, 0.06], [0.001, 0.062]] as [number, number][],
      footRingRadius: 0.16,
      footRingTube: 0.011,
      footRingY: 0.3,
    },
    // 吊灯：在水平面上摆放，高度固定
    pendants: {
      hangFrom: 2.6,
      shadeBottom: 1.85,
      cordRadius: 0.006,
      // 宽扁灯罩轮廓：自下而上（外沿 → 顶），开口朝下
      shade: [[0.2, 0], [0.2, 0.012], [0.12, 0.05], [0.05, 0.07], [0.001, 0.072]] as [number, number][],
      capRadius: 0.045,
      bulbRadius: 0.04,
      // 灯下光斑：半径、落在哪个高度（默认吧台台面）
      poolRadius: 0.5,
      poolHeight: 1.05,
    },
  },

  // ───────── 座位 ─────────
  seating: {
    // 两个座位水平距离小于这个值就算邻座
    neighborDistance: 1.3,
    // 镜头飞向座位时的默认取景（之后用）
    focus: { lift: 0.45, azimuthDeg: 45, depressionDeg: 38, viewSize: 2.4 },
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
    // 坐姿时相对座位中心往后挪一点（米），坐得更深
    sitBack: 0.03,
    // 默认坐在哪个座位（座位 id = 家具在 layout.json 里的 id；多座家具为 id:序号）
    seatId: 'chair-a1',
    // 站姿时站在这里（用来对照设计稿看比例）
    standPosition: [0.4, 0, 1.6] as Vec3,
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
