import { Color, ShaderMaterial, Vector2, type Texture } from 'three'

// 窗外的天空和城市剪影：自定义着色器，不受场景光照影响。
// 昼夜用同一组贴图，在着色器里按 uNight（0 白天 → 1 夜晚）混合。

const vertex = /* glsl */ `
  varying vec3 vPos;
  varying vec2 vUv;
  void main() {
    vPos = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/** 天空：在窗口范围内从下（地平线色）到上（天顶色）的渐变，跟着窗框走，看起来像无限远 */
export function createSkyMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uNight: { value: 0 },
      uDayTop: { value: new Color() },
      uDayHorizon: { value: new Color() },
      uNightTop: { value: new Color() },
      uNightHorizon: { value: new Color() },
    },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      uniform float uNight;
      uniform vec3 uDayTop, uDayHorizon, uNightTop, uNightHorizon;
      varying vec2 vUv;
      void main() {
        float k = smoothstep(0.0, 1.0, vUv.y);
        vec3 day = mix(uDayHorizon, uDayTop, k);
        vec3 night = mix(uNightHorizon, uNightTop, k);
        gl_FragColor = vec4(mix(day, night, uNight), 1.0);
      }
    `,
    depthWrite: true,
  })
}

/** 一层城市剪影：贴图给出楼体轮廓，窗户按世界坐标的格子程序化生成，往下无限延伸 */
export function createCityMaterial(map: Texture) {
  return new ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTileWidth: { value: 20 },
      // 窗户沿墙的位置（米），加到 x 上，让城市固定在世界里
      uOffset: { value: 0 },
      // 受控视差：从投影坐标里减掉这部分位移，只保留 parallax 比例的真实视差
      uShift: { value: new Vector2() },
      // 楼的体积：楼身往后"挤出"在画面上的位移（米，随视线变化），以及楼顶变亮、侧面变暗的程度
      uExtrude: { value: new Vector2() },
      uRoofLighten: { value: 0.14 },
      uSideDarken: { value: 0.24 },
      uHeight: { value: 10 },
      uBaseY: { value: 0 },
      uDayColor: { value: new Color() },
      uNightColor: { value: new Color() },
      uLitColor: { value: new Color() },
      uNight: { value: 0 },
      uLitRatio: { value: 0.3 },
      uTwinkleRatio: { value: 0.03 },
      uTwinkleSpeed: { value: new Vector2(0.15, 0.45) },
      uLitIntensity: { value: 4 },
      uDetail: { value: 1 },
      uTime: { value: 0 },
      uSeed: { value: 0 },
      uCell: { value: new Vector2(1, 1) },
      uPane: { value: new Vector2(0.5, 0.4) },
      uDayPaneDarken: { value: 0.12 },
      uBodyVariation: { value: 0.16 },
      // 信号灯（只在最近一层开）：贴图里的位置、颜色、半径（米）、亮度、闪烁周期
      uBeaconOn: { value: 0 },
      uBeaconUV: { value: new Vector2() },
      uBeaconColor: { value: new Color() },
      uBeaconRadius: { value: 0.15 },
      uBeaconIntensity: { value: 6 },
      uBeaconPeriod: { value: 2.6 },
    },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOffset;
      uniform vec2 uShift, uExtrude;
      uniform float uRoofLighten, uSideDarken;
      uniform float uTileWidth, uHeight, uBaseY, uNight, uLitRatio, uTwinkleRatio, uLitIntensity, uDetail, uTime, uSeed;
      uniform float uDayPaneDarken, uBodyVariation;
      uniform vec2 uTwinkleSpeed, uCell, uPane, uBeaconUV;
      uniform vec3 uDayColor, uNightColor, uLitColor, uBeaconColor;
      uniform float uBeaconOn, uBeaconRadius, uBeaconIntensity, uBeaconPeriod;
      varying vec3 vPos;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.13) * 43758.5453);
      }
      // 贴图采样：横向平铺；纵向低于底部 = 实心楼体（能开窗），高于顶部 = 天空
      vec4 city(vec2 world) {
        float u = world.x / uTileWidth;
        float v = (world.y - uBaseY) / uHeight;
        if (v < 0.0) return vec4(1.0, 0.5, 1.0, 1.0);
        if (v > 1.0) return vec4(0.0);
        return texture2D(uMap, vec2(fract(u), v));
      }

      // 红色信号灯：每个平铺周期里最高的那栋楼顶各一盏，缓慢闪烁（低画质档不闪）
      float beacon(vec2 world) {
        if (uBeaconOn < 0.5) return 0.0;
        float u = world.x / uTileWidth;
        float du = (fract(u - uBeaconUV.x + 0.5) - 0.5) * uTileWidth;
        float dv = world.y - (uBaseY + uBeaconUV.y * uHeight);
        float d = length(vec2(du, dv));
        float pulse = 0.5 + 0.5 * sin(uTime * 6.2831 / uBeaconPeriod);
        return smoothstep(uBeaconRadius, 0.0, d) * mix(1.0, pulse, uDetail);
      }

      void main() {
        vec2 world = vec2(vPos.x + uOffset, vPos.y) - uShift;
        vec4 t = city(world);
        float glow = beacon(world);
        vec3 beaconCol = uBeaconColor * uBeaconIntensity * mix(0.35, 1.0, uNight);

        // 楼的体积：正面之外的地方，沿挤出方向往回找——找到楼身就是这栋楼的楼顶或侧面
        if (t.r < 0.5) {
          // 先粗找：沿挤出方向往回走，找到第一个落在楼身上的位置
          const int STEPS = 12;
          float hitT = -1.0;
          for (int i = 1; i <= STEPS; i++) {
            float k = float(i) / float(STEPS);
            if (city(world - uExtrude * k).r > 0.5) { hitT = k; break; }
          }
          // 再二分细化楼身边缘，避免一圈圈的台阶纹
          vec2 src = world;
          vec4 srcTex = vec4(0.0);
          if (hitT > 0.0) {
            float lo = hitT - 1.0 / float(STEPS);
            float hi = hitT;
            for (int j = 0; j < 5; j++) {
              float mid = 0.5 * (lo + hi);
              if (city(world - uExtrude * mid).r > 0.5) hi = mid; else lo = mid;
            }
            src = world - uExtrude * hi;
            srcTex = city(src);
          }
          if (hitT < 0.0) {
            // 楼顶上方的天空：只画信号灯的光点
            if (glow < 0.5) discard;
            gl_FragColor = vec4(beaconCol, 1.0);
            return;
          }
          vec3 b = mix(uDayColor, uNightColor, uNight);
          b *= 1.0 - uBodyVariation * 0.5 + uBodyVariation * srcTex.g;
          // 源点贴着楼顶边缘 → 楼顶（亮一点）；否则是侧面（暗一点）
          float eps = uHeight * 0.006;
          bool roof = city(src + vec2(0.0, eps)).r < 0.5;
          vec3 c = roof ? b * (1.0 + uRoofLighten) : b * (1.0 - uSideDarken);
          gl_FragColor = vec4(mix(c, beaconCol, glow), 1.0);
          return;
        }

        vec3 body = mix(uDayColor, uNightColor, uNight);
        body *= 1.0 - uBodyVariation * 0.5 + uBodyVariation * t.g;

        // 窗户：按世界坐标划格子，格子中心在楼身上才开窗
        vec2 cc = vec2(world.x, world.y - uBaseY) / uCell;
        vec2 cell = floor(cc);
        vec2 f = fract(cc) - 0.5;
        float inPane = step(abs(f.x), uPane.x * 0.5) * step(abs(f.y), uPane.y * 0.5);
        vec4 centerTex = city((cell + 0.5) * uCell + vec2(0.0, uBaseY));
        inPane *= step(0.5, centerTex.r) * step(0.5, centerTex.b);

        float r = hash(cell);
        float lit = step(r, uLitRatio);
        // 一小部分亮着的窗户缓慢亮灭（低画质档关闭）
        float twinkle = step(uLitRatio - uTwinkleRatio, r) * lit * uDetail;
        float speed = mix(uTwinkleSpeed.x, uTwinkleSpeed.y, fract(r * 91.7));
        float on = step(0.0, sin(uTime * speed + r * 60.0));
        lit *= 1.0 - twinkle * (1.0 - on);

        vec3 col = body * (1.0 - inPane * (1.0 - uNight) * uDayPaneDarken);
        col += uLitColor * uLitIntensity * lit * inPane * uNight;

        col = mix(col, beaconCol, glow);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

/** 玻璃：几乎透明的一层，不做反光（不用 transmission） */
export function createGlassMaterial() {
  return new ShaderMaterial({
    uniforms: { uOpacity: { value: 0.04 } },
    vertexShader: vertex,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      void main() {
        gl_FragColor = vec4(vec3(1.0), uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
  })
}
