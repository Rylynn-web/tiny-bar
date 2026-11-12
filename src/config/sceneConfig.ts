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
    // 只投影、不显示的物体（侧墙的隐形投影墙）放在这一层：主相机不画它们，只有主光的阴影相机画，省掉主画面的绘制调用
    shadowOnlyLayer: 1,
  },
  performance: {
    // 每个物件内部把同材质零件合并成一个网格（减少绘制调用）；leva 里可开关对比
    mergeStatic: true,
    // 画质档：auto = 触屏设备用 low，其余 high。low 会关掉窗外窗灯亮灭、信号灯闪烁等细节动画
    quality: 'auto' as 'auto' | 'high' | 'low',
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
      // 前方低处的一块：墙上的镜子从默认视角反射的是这个方向，没有它镜子会发灰
      { position: [0, -5, 5] as Vec3, scale: [14, 7] as [number, number], intensity: 0.8, rotationX: 0 },
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
    orange: '#E07B39',
    leaf: '#6E9461',
    leafDark: '#4A6E4C',
    // 饱和强调色：只用在墙面装饰品上，而且面积要小（家具和墙面保持低饱和）
    accentCobalt: '#2F5BD3',
    accentVermilion: '#F0582A',
    accentGrass: '#62C14C',
    accentLemon: '#F4D23C',
    accentPink: '#F59AC2',
    accentCyan: '#1FA2CF',
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
    // 台灯类：叠环台灯、蘑菇台灯、落地灯
    lamp: 7,
    // 灯具下方的假光斑（叠加混合的径向渐变），不是真实光源
    pool: 0.55,
    // 粉色发光球壁灯
    sconce: 7,
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
    // 镜子：同一套金属材质，粗糙度低得多；反射的是只渲染一次的环境柔光板，不做实时反射
    mirrorRoughness: 0.08,
    mirrorEnvMapIntensity: 1.6,
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
    // 从房间正面偏左上打过来：右墙的影子落在房间外，左墙的影子只贴着墙根，三面墙都能受一点光
    sunPosition: [-1.2, 6, 6] as Vec3,
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
    // 默认视角：方位角从 +Z 起绕 Y 轴（正 = 右前方）；45° 从右前方正对后墙和左墙的墙角
    defaultAzimuthDeg: 45,
    // 默认俯角（与地面夹角）
    defaultDepressionDeg: 45,
    // 画面短边能看到的世界尺寸（米）：全景 = 最远，近景 = 最近（大约一张桌子）
    fullViewSize: 11,
    closeViewSize: 1.5,
  },
  controls: {
    // 水平方向的允许范围（方位角，0° = 正对后墙，正值 = 摄像机在右前方）。
    // 左右墙会按视角自动降低，所以能从左前方一直转到右前方；超过 ±90° 会跑到后墙背后
    azimuthMinDeg: -80,
    azimuthMaxDeg: 80,
    // 俯角范围（与地面夹角）：不能平视，也不能正俯视
    minDepressionDeg: 25,
    maxDepressionDeg: 60,
    // 阻尼：松手后缓停的时间 / 拖动中跟随的时间（秒）
    smoothTime: 0.3,
    draggingSmoothTime: 0.12,
    rotateSpeed: 0.6,
    truckSpeed: 1,
    dollySpeed: 0.5,
    // 平移边界：焦点最多走到"房间边缘贴住屏幕边缘"的位置——全景时保持居中，放大后能一路走到角落，
    // 房间不会被拖出屏幕。画面能看到的地面半径 ≈ 屏幕短边 / zoom / 2 × 这个系数（斜视角下地面会被压缩）
    boundaryVisibleFactor: 0.7,
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
  // 地面顶面在 y=0，中心在原点。后墙在 -Z，左墙在 -X，右墙在 +X，前面（+Z）敞开
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
  // 左右墙按视角显示，同一时间只显示一面（加后墙最多两面），没有过渡动画。
  // 方位角 ≥ switchDeg（正对或偏右）显示左墙、不显示右墙；< switchDeg（偏左）显示右墙、不显示左墙
  walls: {
    switchDeg: 0,
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

  // ───────── 城市落地窗（墙面物件，墙上会按窗户位置开洞）─────────
  cityWindow: {
    defaultWidth: 3.0,
    minWidth: 1.0,
    // 上限比墙长：设到最大就铺满整面墙（实际宽度会自动收到墙内）
    maxWidth: 7.0,
    // 窗洞下沿、上沿高度（米）
    sillHeight: 0.1,
    headHeight: 2.35,
    frameWidth: 0.05,
    frameDepth: 0.06,
    mullionWidth: 0.035,
    // 窗外每层的投影四边形比窗洞再大出这么多，藏住窗框下的接缝
    layerMargin: 0.04,
    // 窗洞离墙两端至少留这么多；房间变窄时窗户会自动缩窄
    wallMargin: 0.15,
    // 玻璃：几乎透明，不做反光
    glassOpacity: 0.04,
  },
  // 窗外城市：天空 + 多层剪影。各层按当前视线把窗洞投影到自己所在的深度，每帧都正好铺满窗口
  cityView: {
    seed: 20261111,
    textureSize: 512,
    // 从远到近。depth：离墙外表面的距离（米）；tileWidth / height：一张贴图对应的世界宽度、楼群高度（米）；
    // buildingWidth：楼宽（贴图像素）；buildingHeight：楼高占 height 的比例；skylineAt：默认视角下平均楼顶落在窗高的哪个比例处；
    // windowCell / windowSize：窗格间距（米）和窗户占格子的比例；
    // parallax：保留多少真实视差（0 = 跟着窗口不动，1 = 完全按几何投影）。正交相机下真实视差过大，
    // 俯角稍一变远景就会整片沉到窗下，所以远景只留一点，近景多一点
    layers: [
      {
        depth: 10,
        tileWidth: 7,
        height: 3.4,
        buildingWidth: [10, 30] as [number, number],
        buildingHeight: [0.3, 0.8] as [number, number],
        roundChance: 0.55,
        spireChance: 0.1,
        skylineAt: 0.62,
        parallax: 0.05,
        // 楼的进深（米）：决定楼顶和侧面在画面上露出多少
        buildingDepth: 0.12,
        windowCell: [0.1, 0.12] as [number, number],
        windowSize: [0.55, 0.45] as [number, number],
        dayColor: '#C8D1DD',
        nightColor: '#4A4C7C',
      },
      {
        depth: 5,
        tileWidth: 7.5,
        height: 3.7,
        buildingWidth: [14, 40] as [number, number],
        buildingHeight: [0.25, 0.8] as [number, number],
        roundChance: 0.5,
        spireChance: 0.08,
        skylineAt: 0.46,
        parallax: 0.12,
        buildingDepth: 0.17,
        windowCell: [0.12, 0.15] as [number, number],
        windowSize: [0.55, 0.45] as [number, number],
        dayColor: '#A8B5C6',
        nightColor: '#30335A',
      },
      {
        depth: 2.5,
        tileWidth: 8,
        height: 4,
        buildingWidth: [22, 60] as [number, number],
        buildingHeight: [0.22, 0.8] as [number, number],
        roundChance: 0.45,
        spireChance: 0.06,
        skylineAt: 0.3,
        parallax: 0.25,
        buildingDepth: 0.24,
        windowCell: [0.15, 0.18] as [number, number],
        windowSize: [0.55, 0.45] as [number, number],
        dayColor: '#8C9AAE',
        nightColor: '#1D1F37',
      },
    ],
    sky: {
      day: { top: '#B9D0E8', horizon: '#ECEFF1' },
      night: { top: '#262B5E', horizon: '#6C66A3' },
    },
    // 夜晚亮灯的窗户比例；其中这一部分会缓慢亮灭（周期由 twinkleSpeed 的角速度决定，弧度/秒）
    litRatio: 0.3,
    twinkleRatio: 0.03,
    twinkleSpeed: [0.15, 0.45] as [number, number],
    litColor: '#FFD27A',
    // 窗灯亮度：要高于 Bloom 阈值才有光晕
    litIntensity: 4.5,
    // 白天窗玻璃比楼体暗一点
    dayPaneDarken: 0.12,
    // 楼体明暗的随机起伏
    bodyVariation: 0.16,
    // 体积感：楼顶变亮、侧面变暗的比例；挤出在画面上的最大长度（米），防止极端视角下拉得太长
    roofLighten: 0.14,
    sideDarken: 0.26,
    extrudeMax: 0.6,
    // 楼的进深：每层 buildingDepth × depthScale，再按每栋楼的随机值乘 depthVariation 里的倍数（前后层次）
    depthScale: 1.8,
    depthVariation: [0.6, 1.4] as [number, number],
    // 侧面：从转角往深处越来越暗的额外比例、转角那道亮线（占侧面进深的比例、提亮多少）
    sideGradient: 0.35,
    cornerEdge: 0.06,
    cornerLighten: 0.14,
    // 楼顶前沿的浅色压边（占楼顶进深的比例）
    roofEdge: 0.12,
    // 侧面窗户：沿进深方向的窗距（相对正面窗距的比例，透视压缩）和窗占格子的比例；低画质档不画
    sideCellScale: 0.7,
    sidePane: [0.5, 0.45] as [number, number],
    // 最近一层最高楼顶的红色信号灯
    beacon: { color: '#FF3B30', radius: 0.05, intensity: 6, period: 2.6 },
    // 昼夜切换的过渡时间（秒）
    transitionSeconds: 1,
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
  // 门口地毯：长方形薄地毯，图案程序生成（0 格子 / 1 波浪线 / 2 条纹）。底色用调色板基础色，线条奶白，一点强调色点缀
  doorMat: {
    width: 1.1,
    depth: 0.66,
    thickness: 0.012,
    patterns: 3,
    lineColor: 'cream',
    accent: 'accentVermilion',
    textureSize: 512,
  },


  // ───────── 沙发区 ─────────
  // 都是局部坐标（原点在物件底面中心，+Z 为正面），摆放位置在 layout.json
  lounge: {
    sofa: {
      width: 1.7,
      depth: 0.85,
      // 不锈钢管框把沙发托离地面的高度
      liftHeight: 0.07,
      baseHeight: 0.2,
      armWidth: 0.18,
      armHeight: 0.26,
      backDepth: 0.2,
      backHeight: 0.38,
      cushionThickness: 0.13,
      cushionGap: 0.02,
      // 座位锚点在坐垫上往前挪一点（米）
      seatForward: 0.04,
      // 管框：侧面圆角矩形的高度、离两端的缩进、管半径、圆角半径
      frameHeight: 0.32,
      frameInset: 0.06,
      frameRadius: 0.014,
      frameCorner: 0.06,
      frameOutset: 0.03,
      pillow: { size: [0.42, 0.38, 0.12] as Vec3, tilt: deg(16), insetSize: [0.2, 0.2, 0.02] as Vec3, side: -1 },
    },
    pouf: { size: [0.5, 0.4, 0.5] as Vec3, radius: 0.1 },
    coffeeTable: {
      topSize: [1.0, 0.06, 0.55] as Vec3,
      baseSize: [0.84, 0.3, 0.4] as Vec3,
    },
    zebraRug: {
      size: [2.3, 1.7] as [number, number],
      thickness: 0.012,
      // 贴图：边长、条纹数量、波浪振幅与频率、条纹粗细（0–1，占一个周期的比例）
      textureSize: 512,
      stripes: 11,
      waveAmplitude: 0.035,
      waveFrequency: 2.5,
      stripeWeight: 0.45,
      // 贴图面离地毯顶面的距离，防止闪烁
      surfaceOffset: 0.001,
    },
    bookshelf: {
      width: 1.4,
      depth: 0.38,
      height: 1.0,
      board: 0.03,
      // 下层（唱片格）顶板高度；下层分成几格
      midShelfY: 0.5,
      cubbies: 3,
      books: {
        depth: 0.22,
        thickness: [0.025, 0.045] as [number, number],
        height: [0.22, 0.32] as [number, number],
        gap: 0.004,
        colors: ['navy', 'rust', 'cream', 'sage', 'wood', 'pendantGreen', 'dark', 'orange'] as const,
        seed: 11,
      },
      records: {
        perCubby: 7,
        size: [0.012, 0.31, 0.31] as Vec3,
        colors: ['dark', 'cream', 'navy', 'rust', 'orange', 'sage', 'wood'] as const,
      },
    },
    turntable: {
      baseSize: [0.42, 0.08, 0.34] as Vec3,
      platterRadius: 0.13,
      platterHeight: 0.012,
      labelRadius: 0.04,
      armLength: 0.2,
      armRadius: 0.006,
      // 唱盘中心、唱臂支点相对底座中心的位置（x, z）
      platterOffset: [-0.05, 0.01] as [number, number],
      armPivot: [0.15, -0.1] as [number, number],
      armYaw: deg(25),
      lidSize: [0.42, 0.08, 0.34] as Vec3,
      // 防尘盖打开的角度
      lidOpen: deg(58),
    },
    stackLamp: { rings: 3, ringRadius: 0.085, tube: 0.05, spacing: 0.085, topRadius: 0.07 },
    // 光斑离所在台面的高度，防止闪烁
    poolLift: 0.003,
    mushroomLamp: { stemRadius: 0.028, stemHeight: 0.14, headRadius: 0.1, poolRadius: 0.38 },
    floorLamp: {
      baseRadius: 0.17,
      baseHeight: 0.03,
      tubeRadius: 0.013,
      // 弧管经过的点（局部坐标，弧向 +X 伸出）
      arc: [[0, 0.03, 0], [0, 1.4, 0], [0.12, 1.85, 0], [0.55, 1.98, 0], [0.9, 1.82, 0]] as Vec3[],
      shade: [[0.16, 0], [0.15, 0.04], [0.1, 0.12], [0.03, 0.15], [0.001, 0.152]] as [number, number][],
      bulbRadius: 0.045,
      poolRadius: 0.55,
      // 光斑默认落在这个高度（局部，大约沙发坐垫面）；layout 里可用 props.poolHeight 覆盖
      poolHeight: 0.42,
    },
    vase: {
      profile: [[0.001, 0], [0.045, 0], [0.06, 0.05], [0.05, 0.12], [0.025, 0.17], [0.028, 0.2], [0.024, 0.2], [0.02, 0.17], [0.001, 0.17]] as [number, number][],
      stems: 5,
      stemLength: [0.22, 0.34] as [number, number],
      stemRadius: 0.004,
      stemSpread: deg(28),
      berriesPerStem: 5,
      berryRadius: 0.018,
      // 浆果在枝头附近散开的范围
      berryScatter: 0.035,
      colors: ['orange', 'rust'] as const,
      seed: 7,
    },
    bookStack: {
      books: [
        { size: [0.26, 0.04, 0.2] as Vec3, color: 'cream', yaw: deg(4) },
        { size: [0.24, 0.035, 0.18] as Vec3, color: 'navy', yaw: deg(-6) },
        { size: [0.2, 0.03, 0.16] as Vec3, color: 'rust', yaw: deg(10) },
      ],
    },
  },

  // ───────── 植物（外部模型，见 public/models/CREDITS.md）─────────
  plants: {
    species: {
      // height：缩放到这个高度（米）；baseAnchor：土面在模型包围盒高度的哪个比例处（0 = 底部；垂吊植物在中间偏上）
      monstera: { url: '/models/plants/monstera.glb', height: 1.15, baseAnchor: 0, pot: 'steel', label: '龟背竹' },
      banana: { url: '/models/plants/banana.glb', height: 2.0, baseAnchor: 0, pot: 'steelTall', label: '香蕉树' },
      pothos: { url: '/models/plants/pothos.glb', height: 0.7, baseAnchor: 0.62, pot: 'ceramic', label: '绿萝' },
    },
    pots: {
      // 盆口半径、盆底半径、高度
      steel: { radiusTop: 0.21, radiusBottom: 0.18, height: 0.34 },
      steelTall: { radiusTop: 0.25, radiusBottom: 0.21, height: 0.42 },
      ceramic: { radiusTop: 0.11, radiusBottom: 0.085, height: 0.12 },
    },
    // 盆壁厚度；土面半径占盆口的比例；土面比盆口低多少、植物根部再往土里埋多少
    rimThickness: 0.012,
    soilRadiusRatio: 0.94,
    soilDrop: 0.025,
    plantSink: 0.02,
    // 按模型原本的颜色给三角面分类：色相在这个范围、饱和度够高的算叶子，亮度低于 darkLightness 的算深色叶子
    // 材质名匹配 stemNamePattern 的直接算茎干
    classify: { hueMin: 55, hueMax: 175, minSaturation: 0.18, darkLightness: 0.42, stemNamePattern: 'trunk|stem|branch' },
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

  // ───────── 墙面装饰 ─────────
  // 尺寸单位：米。画作、圆盘、相框的原点都在墙面上、画面中心高度；局部 +Z 朝室内
  decor: {
    // 强调色池：画作和小摆件只从这里取色（"换配色"从中重新组合）
    accents: ['accentCobalt', 'accentVermilion', 'accentGrass', 'accentLemon', 'accentPink', 'accentCyan'] as const,
    // 画作贴图：长边像素（高画质 / 手机与低画质），只生成一次并缓存
    textureSize: { high: 1024, low: 512 },
    // 画布：厚度、圆角、离墙距离（留一条缝让 AO 在边缘压出淡阴影）、侧边颜色
    canvas: { depth: 0.028, radius: 0.01, wallGap: 0.014, edge: 'cream', roughness: 0.92 },
    bokeh: {
      width: 0.62,
      height: 0.9,
      // 光斑个数、半径（占画面短边的比例）、不透明度
      spots: [16, 26] as [number, number],
      spotRadius: [0.05, 0.2] as [number, number],
      spotAlpha: [0.25, 0.75] as [number, number],
      base: 'dark',
    },
    orb: {
      size: 0.86,
      // 中间浅色圆的半径（占画面边长）、外圈柔光的范围
      orbRadius: 0.2,
      haloRadius: 0.42,
      orbColor: 'cream',
    },
    horizon: {
      width: 0.4,
      height: 0.3,
      bands: [2, 4] as [number, number],
      sunRadius: [0.12, 0.2] as [number, number],
      base: 'cream',
    },
    plate: {
      radius: 0.17,
      thickness: 0.022,
      // 正面同心圆圈数
      rings: [4, 7] as [number, number],
      base: 'cream',
      textureSize: 512,
    },
    mirror: {
      count: 4,
      countRange: [3, 6] as [number, number],
      width: 0.22,
      height: 0.12,
      gap: 0.035,
      depth: 0.012,
      wallGap: 0.006,
    },
    sconce: {
      radius: 0.1,
      // 墙上的金属底座和伸出的短杆
      baseRadius: 0.04,
      baseDepth: 0.014,
      armRadius: 0.008,
      armLength: 0.1,
      color: 'accentPink',
      // 墙上的假光晕（叠加混合）
      haloRadius: 0.55,
      haloOpacity: 0.6,
    },
    shelfSet: {
      width: 0.86,
      depth: 0.15,
      thickness: 0.024,
      // 上层板相对下层板的高度
      gap: 0.34,
      color: 'cream',
      // 相框：外框宽、厚，里面是抽象色块
      frames: [
        { shelf: 1, x: -0.22, width: 0.2, height: 0.26, color: 'dark' },
        { shelf: 1, x: 0.04, width: 0.16, height: 0.2, color: 'accentVermilion' },
        { shelf: 0, x: 0.24, width: 0.18, height: 0.14, color: 'cream' },
      ],
      frameBorder: 0.014,
      frameDepth: 0.016,
      // 相框往后靠墙的倾角（度）
      frameLeanDeg: 8,
      frameTextureSize: 256,
      vase: {
        x: -0.24,
        // 旋转体轮廓 [半径, 高度]
        profile: [
          [0, 0],
          [0.028, 0],
          [0.034, 0.03],
          [0.026, 0.075],
          [0.012, 0.1],
          [0.014, 0.11],
        ] as [number, number][],
        color: 'accentCobalt',
        stemLength: 0.2,
        stemRadius: 0.0025,
        flowerRadius: 0.022,
        flowerColor: 'accentLemon',
      },
      // 小摆件：圆环
      ornament: { x: 0.02, radius: 0.04, tube: 0.016, color: 'accentGrass' },
    },
    // 唱片墙：一排（或几排）亚克力展示格，每格夹一张封套或一张黑胶。原点在墙面上、整组的中心
    recordWall: {
      cols: 3,
      rows: 1,
      colsRange: [1, 6] as [number, number],
      rowsRange: [1, 3] as [number, number],
      // 每格的亚克力板边长、格间距
      cell: 0.36,
      gap: 0.05,
      sleeve: 0.31,
      discRadius: 0.15,
      discThickness: 0.004,
      // 封套 / 唱片离墙的距离，亚克力板厚度和它离墙的距离
      itemZ: 0.022,
      acrylicDepth: 0.008,
      acrylicZ: 0.042,
      // 四角的金属支钉
      standoffRadius: 0.007,
      standoffInset: 0.022,
      // 每格贴图的像素（全部格子拼成一张贴图）
      textureCell: 256,
    },
    // 墙挂书架（参考图：半透明彩色亚克力托槽 + 镀铬横杆 + 两端红色小球），书和杂志封面朝外靠墙放。
    // 原点在墙面上、最下面一层托槽的底面中心
    bookLedge: {
      rows: 3,
      rowsRange: [1, 3] as [number, number],
      width: 1.1,
      widthRange: [0.6, 2.4] as [number, number],
      rowGap: 0.38,
      // 托槽：底板 + 前挡板，半透明；从上到下每层一种颜色
      trayDepth: 0.06,
      lipHeight: 0.06,
      trayThickness: 0.006,
      trayOpacity: 0.55,
      trayColors: ['accentGrass', 'orange', 'accentCobalt'],
      // 镀铬横杆（在挡板前方、书的下三分之一处）、两端立柱和杆头小球、卡扣
      railY: 0.11,
      railZ: 0.072,
      railRadius: 0.005,
      railOverhang: 0.05,
      postRadius: 0.006,
      postBottom: -0.04,
      postTop: 0.15,
      postInset: 0.02,
      ballRadius: 0.013,
      ballColor: 'accentVermilion',
      clipSize: [0.02, 0.026, 0.012] as [number, number, number],
      // 书 / 杂志：每层几本、宽高（米）、厚度、往墙靠的角度、摊开杂志的概率
      booksPerRow: [3, 5] as [number, number],
      bookWidth: [0.17, 0.24] as [number, number],
      bookHeight: [0.22, 0.3] as [number, number],
      bookThickness: [0.006, 0.014] as [number, number],
      bookLeanDeg: 9,
      openChance: 0.15,
      pageColor: 'cream',
      // 封面只用这三组颜色：米色系 / 黑白 / 深蓝
      // 每组：[底色 / 主图形色（两者会互换），小面积点缀色]
      coverGroups: [
        ['cream', 'wood', 'dark'],
        ['dark', 'cream', 'wall'],
        ['navy', 'cream', 'wood'],
      ],
      textureCell: 160,
    },
    rod: {
      length: 2.4,
      lengthRange: [0.6, 6] as [number, number],
      radius: 0.008,
      // 两端固定座
      mountRadius: 0.014,
      mountLength: 0.05,
      color: 'dark',
    },
  },

  // ───────── 脸部可见性检查（只在 ?debug 下）─────────
  // 每个座位：在允许的相机角度范围内，是否存在一个角度能看到小人的正脸
  faceCheck: {
    // 相机方向与小人朝向的最大夹角
    maxAngleDeg: 60,
    // 角度取样步长
    sampleStepDeg: 1,
    // 不算座位的家具类型（吧台只是摆设）
    excludeTypes: ['barStool'],
    // 调试标记：看得到 / 看不到正脸
    okColor: '#3FBF5F',
    failColor: '#E0453A',
    markerRadius: 0.07,
    markerLift: 0.05,
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
