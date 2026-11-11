---
name: scene-style
description: 小酒馆 3D 场景的视觉与性能规则（材质、颜色、造型、贴图、光照、实例化、影子）。新增或修改 src/scene/ 下任何物件、材质、灯光、贴图之前先读。
---

# 小酒馆场景风格规则

C4D 微缩模型质感：圆角、哑光、柔和阴影、低饱和暖色。所有数值放 `src/config/sceneConfig.ts`，组件里不写死。

## 材质
- **默认哑光**：`roughness ≥ 0.7`，`metalness = 0`。统一走 `Matte` 组件。
- **金属白名单**：只有不锈钢、镀铬、黄铜可以用金属材质，且只用于——灯具、吧凳、桌腿、花盆、摇酒壶/量杯、水龙头、门把、沙发管框。参数 `metalness = 1`，`roughness 0.3–0.45`，统一走 `Metal` 组件，具体值在 config。
- **金属必须有环境反射**，否则发黑：用 drei `Environment` + 程序化 `Lightformer` 柔光板，只渲染一次（`frames={1}`），不下载 HDR。
- **玻璃 / 亚克力**：不用 `transmission`（太贵），用 `transparent` + `opacity` 的半透明标准材质，`depthWrite={false}`。

## 颜色
- 所有颜色从 `sceneConfig.palette` 取，组件里不出现色值。
- 新颜色先加进调色板并列给用户确认，再使用。
- Bar Buddy 保持黑白，不受场景调色板影响（`sceneConfig.buddy`）。

## 造型
- 方块一律用 `BevelBox`，圆形物件用 `RoundedCylinder` 或旋转体，倒角来自统一参数。
- 倒角分三档：大件家具 / 小件 / 细杆，档位值在 config。
- 复杂轮廓（L 形吧台、斜角地面、壳形椅）用 `Shape` + `ExtrudeGeometry`（带 bevel）或 `LatheGeometry`。
- 同一种家具的多个实例共用同一套几何体与材质（模块级缓存或 `useMemo`），只换颜色。

## 贴图（CanvasTexture）
- 只画**原创抽象图形**，不照搬参考图。
- 边长 ≤ 512，启动时生成一次并缓存，`colorSpace = SRGBColorSpace`。
- 配色从调色板取。

## 光照
- **只有一盏投影光**（主平行光）。其余灯具、蜡烛、灯带用**自发光 + Bloom**。
- Bloom 阈值设在 3（`sceneConfig.bloom.luminanceThreshold`）：被主光照亮的浅色表面在 HDR 里能到 2.5 左右，阈值低了会被误判成发光。自发光物件的最终亮度要高于阈值才会有光晕。用 `mipmapBlur`。
- 自发光强度按物件分组放 config，白天几乎关闭，夜晚打开。
- 需要补光时最多 2 盏不投影的点光源，默认不开。

## 实例化与预算
- 同一几何体出现 ≥ 8 次就用 `InstancedMesh`，颜色用 instanceColor。
- 全场景目标：draw calls ≤ 150，三角面 ≤ 15 万。每批搭完测量一次。
- 外部模型（只限植物，椅子备选）每个 ≤ 300KB，用 drei `useGLTF` 加载；下载前向用户确认文件名、来源、大小。

## 影子
- 开口的薄壳物件（灯罩、杯子、花瓶、碗）必须 `shadowSide = DoubleSide`，否则只有背光那半边投影，会出现月牙形影子。
- 小物件（杯子、瓶子、书、浆果）不投影只接收，省阴影贴图开销。

## 手机
- 任何视觉改动都要考虑手机性能：后处理开销、DPR 上限 1.5、阴影贴图 1024。
