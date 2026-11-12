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
      // 每栋楼进深不同：最浅的楼占完整挤出的比例（最深 = 1）；完整挤出对应的进深（米，侧面开窗用）
      uDepthMin: { value: 0.43 },
      uExtrudeDepth: { value: 0.2 },
      // 侧面：越深越暗、转角亮线、楼顶前沿压边、侧面窗距（米）和窗占格子的比例
      uSideGradient: { value: 0.35 },
      uCornerEdge: { value: 0.06 },
      uCornerLighten: { value: 0.14 },
      uRoofEdge: { value: 0.12 },
      uSideCell: { value: 0.08 },
      uSidePane: { value: new Vector2(0.5, 0.45) },
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
      uniform float uDepthMin, uExtrudeDepth, uSideGradient, uCornerEdge, uCornerLighten, uRoofEdge, uSideCell;
      uniform vec2 uSidePane;
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

      // 每栋楼的进深（占完整挤出的比例），由楼的随机值决定；和楼体明暗用的随机值错开
      float depthFrac(float g) {
        return mix(uDepthMin, 1.0, fract(g * 7.31 + 0.17));
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

        // 楼的体积：正面之外的地方，沿挤出方向往回找——找到楼身（且在这栋楼的进深以内）就是它的楼顶或侧面
        if (t.r < 0.5) {
          // 沿挤出方向往回走：每进入一栋楼，先二分找准"进入点"（楼身边缘是连续的，二分很准），
          // 再看进入点是否在这栋楼自己的进深以内——是就是它的侧面 / 楼顶，不是就继续往后找下一栋。
          // 直接用"楼身且在进深内"做粗找，侧面最深处那一小条会被步长跳过，出现虚线状的毛边
          const int STEPS = 12;
          float hi = -1.0;
          float prevIn = 0.0;
          float prevG = -1.0;
          for (int i = 1; i <= STEPS; i++) {
            float k = float(i) / float(STEPS);
            vec4 ck = city(world - uExtrude * k);
            float inside = step(0.5, ck.r);
            // "进入一栋楼"：从楼外进到楼身，或者从一栋楼直接走进紧挨着的另一栋（剪影相连，楼的随机值变了）
            bool entered = inside > 0.5 && (prevIn < 0.5 || abs(ck.g - prevG) > 0.02);
            if (entered) {
              float lo = k - 1.0 / float(STEPS);
              float h = k;
              for (int j = 0; j < 6; j++) {
                float mid = 0.5 * (lo + h);
                vec4 cm = city(world - uExtrude * mid);
                if (cm.r > 0.5 && abs(cm.g - ck.g) < 0.02) h = mid; else lo = mid;
              }
              // 楼的随机值从进入点再往楼里走半步的地方取：边缘上的采样会混进楼外 / 隔壁楼的值，
              // 进深忽长忽短，侧面外面会出现一道道虚线
              vec4 cin = city(world - uExtrude * min(h + 0.5 / float(STEPS), 1.0));
              float g = (cin.r > 0.5 && abs(cin.g - ck.g) < 0.02) ? cin.g : ck.g;
              if (h <= depthFrac(g)) { hi = h; break; }
            }
            prevIn = inside;
            prevG = inside > 0.5 ? ck.g : -1.0;
          }
          if (hi < 0.0) {
            // 楼顶上方的天空：只画信号灯的光点
            if (glow < 0.5) discard;
            gl_FragColor = vec4(beaconCol, 1.0);
            return;
          }
          vec2 src = world - uExtrude * hi;
          // 同理：楼的随机值 / 能否开窗从楼身里面一点取
          vec4 srcTex = city(world - uExtrude * min(hi + 0.5 / float(STEPS), 1.0));
          // 在这栋楼自己的进深里走到了哪（0 = 转角 / 前沿，1 = 最深处）
          float kn = clamp(hi / depthFrac(srcTex.g), 0.0, 1.0);

          vec3 b = mix(uDayColor, uNightColor, uNight);
          b *= 1.0 - uBodyVariation * 0.5 + uBodyVariation * srcTex.g;
          // 源点贴着楼顶边缘 → 楼顶；否则是侧面
          float eps = uHeight * 0.006;
          bool roof = city(src + vec2(0.0, eps)).r < 0.5;
          vec3 c;
          if (roof) {
            c = b * (1.0 + uRoofLighten);
            // 楼顶前沿一道浅色压边
            if (kn < uRoofEdge) c *= 1.0 + uRoofLighten;
          } else {
            // 侧面：越往深处越暗；转角一道亮线
            c = b * (1.0 - uSideDarken * (1.0 + uSideGradient * kn));
            if (kn < uCornerEdge) c *= 1.0 + uCornerLighten;
            // 侧面窗户：沿进深方向一列列（窗距比正面窄，像透视压缩）；行和正面对齐
            if (uDetail > 0.5 && srcTex.b > 0.5 && kn > uCornerEdge * 1.5) {
              float d = hi * uExtrudeDepth;
              vec2 sc = vec2(d / uSideCell, (src.y - uBaseY) / uCell.y);
              vec2 cell = floor(sc);
              vec2 f = fract(sc) - 0.5;
              float inPane = step(abs(f.x), uSidePane.x * 0.5) * step(abs(f.y), uSidePane.y * 0.5);
              // 这一行的中心还在楼身里才开窗（不在楼顶被切半）
              inPane *= step(0.5, city(vec2(src.x, (cell.y + 0.5) * uCell.y + uBaseY)).r);
              float r = hash(cell + vec2(srcTex.g * 97.0, 13.0));
              float lit = step(r, uLitRatio);
              c *= 1.0 - inPane * (1.0 - uNight) * uDayPaneDarken;
              c += uLitColor * uLitIntensity * 0.8 * lit * inPane * uNight;
            }
          }
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
