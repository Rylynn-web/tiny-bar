// 场景所有尺寸、颜色、灯光、相机参数集中在这里。组件里不写死数值。

const deg = (d: number) => (d * Math.PI) / 180

export const sceneConfig = {
  // 画布
  canvas: {
    background: '#efe6da',
    // 设备像素比上限：手机上 3x 屏渲染开销太大，封顶 2
    dprMin: 1,
    dprMax: 2,
    antialias: true,
  },

  // 测试用圆角立方体
  testBox: {
    size: [1, 1, 1] as [number, number, number],
    radius: 0.12,
    smoothness: 4,
    color: '#e8a87c',
    roughness: 0.6,
    metalness: 0,
    position: [0, 0, 0] as [number, number, number],
  },

  // 灯光
  lights: {
    ambient: { color: '#ffffff', intensity: 0.6 },
    directional: {
      color: '#fff4e5',
      intensity: 1.6,
      position: [4, 8, 5] as [number, number, number],
    },
  },

  // 相机（正交）
  camera: {
    target: [0, 0, 0] as [number, number, number],
    distance: 20,
    // 极角：与竖直向上的夹角。45° 即 45° 俯视
    polarAngle: deg(45),
    // 方位角：绕 Y 轴，从 +Z 方向起算。45° 斜看，像看桌上的模型
    azimuthAngle: deg(45),
    near: 0.1,
    far: 100,
    // 画面短边要能看到的世界尺寸（单位：米）。据此按屏幕算 zoom，手机桌面观感一致
    viewSize: 4,
  },

  // 相机控制
  controls: {
    enablePan: false,
    enableDamping: true,
    dampingFactor: 0.08,
    rotateSpeed: 0.6,
    zoomSpeed: 0.8,
    // 俯仰范围（极角）：最低不超过 65°，永远到不了水平线以下
    minPolarAngle: deg(25),
    maxPolarAngle: deg(65),
    // 水平旋转范围：初始方位角 ±45°，转不到背后
    azimuthRange: deg(45),
    // 缩放范围：相对"刚好装下 viewSize"的倍数
    minZoomFactor: 0.6,
    maxZoomFactor: 2.5,
  },
} as const
