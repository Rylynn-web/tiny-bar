import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, Color, MathUtils, Quaternion, Vector2, Vector3, type Group, type Object3D } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { resolveQuality } from '../../state/quality'
import { BevelBox } from '../primitives/BevelBox'
import type { CatalogProps } from '../catalogTypes'
import { createCityMaterial, createGlassMaterial, createSkyMaterial } from './cityMaterial'
import { getCityTexture } from './cityTexture'
import { hitHeight, projectionShift, projectWindow, type WindowRect } from './viewCoverage'
import { windowWidth } from './windowSize'
import { fitWindow } from './windowFit'
import { useRoomBounds } from '../../state/layoutStore'

const W = sceneConfig.cityWindow
const V = sceneConfig.cityView
const wallThickness = sceneConfig.room.wallThickness

/** 一块投影四边形（4 个顶点每帧更新；UV 固定，天空用它做窗内渐变） */
function makeQuad() {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3))
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2))
  g.setIndex([0, 1, 2, 0, 2, 3])
  return g
}

// 默认视线方向（世界坐标，指向远离相机）
const cam = sceneConfig.camera
const viewDir = (azimuthDeg: number) =>
  new Vector3()
    .setFromSphericalCoords(1, MathUtils.degToRad(90 - cam.defaultDepressionDeg), MathUtils.degToRad(azimuthDeg))
    .negate()
const defaultDir = viewDir(cam.defaultAzimuthDeg)
// 窗所在的墙背对默认视角时（例如默认从右前方看、窗在右墙），改用左右镜像的视角来对齐天际线
const mirroredDir = viewDir(-cam.defaultAzimuthDeg)

const noRaycast = () => null

/**
 * 城市落地窗（墙面物件）：细窗框 + 中竖框 + 几乎透明、不反光的玻璃，窗外是天空和几层城市剪影。
 * 原点在墙内表面、窗洞下沿中点所在的地面高度；局部 +Z 朝室内，墙外表面在 z = -墙厚。
 * 墙上的洞由 Room 按 layout 里的窗户开出来。props.width = 窗宽（米）
 */
export function CityWindow({ props, item }: CatalogProps) {
  const params = useSceneParams()
  const city = params.cityView
  const { palette } = params
  // 实际宽度：不超过墙长，房间变窄时自动缩窄（和 Room 开洞用同一个计算）
  const bounds = useRoomBounds()
  const fit = item ? fitWindow(item, bounds) : null
  const width = fit ? fit.width : windowWidth(props)
  // 被挪回墙内时，窗户相对物件原点的偏移（局部 x）
  // 左墙的局部 +x 指向 -Z，后墙和右墙的局部 +x 分别指向 +X、+Z
  const dx = fit ? (fit.wall === 'left' ? -(fit.center - fit.along) : fit.center - fit.along) : 0
  const height = W.headHeight - W.sillHeight
  const detail = resolveQuality(params.quality) === 'high' ? 1 : 0

  const rect: WindowRect = useMemo(
    () => ({ halfWidth: width / 2, bottom: W.sillHeight, top: W.headHeight, outerZ: -wallThickness, margin: W.layerMargin }),
    [width],
  )

  // 从最近一层往远数，取 layerCount 层；数组保持从远到近
  const layers = useMemo(() => {
    const n = MathUtils.clamp(Math.round(city.layerCount), 1, V.layers.length)
    return V.layers.map((cfg, i) => ({ cfg, i })).slice(V.layers.length - n)
  }, [city.layerCount])

  const sky = useMemo(() => ({ geometry: makeQuad(), material: createSkyMaterial() }), [])
  const cityLayers = useMemo(
    () =>
      layers.map(({ cfg, i }) => {
        const tex = getCityTexture(i, cfg)
        return { i, cfg, tex, geometry: makeQuad(), material: createCityMaterial(tex.texture) }
      }),
    [layers],
  )
  const glass = useMemo(() => createGlassMaterial(), [])

  useEffect(
    () => () => {
      sky.geometry.dispose()
      sky.material.dispose()
      cityLayers.forEach((l) => {
        l.geometry.dispose()
        l.material.dispose()
      })
    },
    [sky, cityLayers],
  )

  // 不随时间变化的 uniform：颜色、比例、天际线高度
  useEffect(() => {
    const s = sky.material.uniforms
    s.uDayTop.value.set(city.skyDayTop)
    s.uDayHorizon.value.set(city.skyDayHorizon)
    s.uNightTop.value.set(city.skyNightTop)
    s.uNightHorizon.value.set(city.skyNightHorizon)
    const nearest = cityLayers[cityLayers.length - 1]
    for (const l of cityLayers) {
      const u = l.material.uniforms
      const depth = city.depths[l.i] ?? l.cfg.depth
      const meanRoof = (l.cfg.buildingHeight[0] + l.cfg.buildingHeight[1]) / 2
      u.uTileWidth.value = l.cfg.tileWidth
      u.uHeight.value = l.cfg.height
      u.uDayColor.value.set(city.layerDay[l.i] ?? l.cfg.dayColor)
      u.uNightColor.value.set(city.layerNight[l.i] ?? l.cfg.nightColor)
      u.uLitColor.value.set(V.litColor)
      u.uLitRatio.value = city.litRatio
      u.uTwinkleRatio.value = city.twinkleRatio
      u.uTwinkleSpeed.value.set(V.twinkleSpeed[0], V.twinkleSpeed[1])
      u.uLitIntensity.value = V.litIntensity
      u.uSeed.value = l.i + 1
      u.uCell.value.set(l.cfg.windowCell[0], l.cfg.windowCell[1])
      u.uPane.value.set(l.cfg.windowSize[0], l.cfg.windowSize[1])
      u.uDayPaneDarken.value = V.dayPaneDarken
      u.uBodyVariation.value = V.bodyVariation
      u.uRoofLighten.value = V.roofLighten
      u.uSideDarken.value = city.sideDarken
      u.uDepthMin.value = V.depthVariation[0] / V.depthVariation[1]
      u.uSideGradient.value = V.sideGradient
      u.uCornerEdge.value = V.cornerEdge
      u.uCornerLighten.value = V.cornerLighten
      u.uRoofEdge.value = V.roofEdge
      u.uSideCell.value = l.cfg.windowCell[0] * V.sideCellScale
      ;(u.uSidePane.value as Vector2).set(V.sidePane[0], V.sidePane[1])
      l.material.userData.fullDepth = l.cfg.buildingDepth * city.depthScale * V.depthVariation[1]
      u.uBeaconOn.value = l === nearest ? 1 : 0
      u.uBeaconUV.value.set(l.tex.tallest.u, l.tex.tallest.v)
      ;(u.uBeaconColor.value as Color).set(V.beacon.color)
      u.uBeaconRadius.value = V.beacon.radius
      u.uBeaconIntensity.value = V.beacon.intensity
      u.uBeaconPeriod.value = V.beacon.period
      // 天际线：默认视角下，平均楼顶落在窗高的 skylineAt 处（用局部坐标下的默认视线算，见 useFrame）
      l.material.userData.depth = depth
      l.material.userData.meanRoof = meanRoof
      l.material.userData.baseReady = false
    }
    glass.uniforms.uOpacity.value = W.glassOpacity
  }, [city, cityLayers, sky, glass, rect])

  const group = useRef<Group>(null)
  const night = useRef(params.timeOfDay === 'night' ? 1 : 0)
  const q = useMemo(() => new Quaternion(), [])
  const dir = useMemo(() => new Vector3(), [])
  const dir0 = useMemo(() => new Vector3(), [])
  const xAxis = useMemo(() => new Vector3(), [])
  const shift = useMemo(() => ({ x: 0, y: 0 }), [])
  const shift0 = useMemo(() => ({ x: 0, y: 0 }), [])
  const worldPos = useMemo(() => new Vector3(), [])

  useFrame(({ camera, clock }, delta) => {
    const g = group.current
    if (!g) return
    // 窗不显示（所在的墙背对摄像机）时不用更新投影
    for (let o: Object3D | null = g; o; o = o.parent) if (!o.visible) return
    // 视线方向换到窗户的局部坐标
    g.getWorldQuaternion(q).invert()
    camera.getWorldDirection(dir).applyQuaternion(q)
    dir0.copy(defaultDir).applyQuaternion(q)
    if (dir0.z > -0.05) dir0.copy(mirroredDir).applyQuaternion(q)
    // 窗户沿墙的位置：挪动窗户时看到城市的不同部分，而不是城市跟着窗户走
    g.getWorldPosition(worldPos)
    xAxis.set(1, 0, 0).applyQuaternion(q.clone().invert())
    const along = worldPos.dot(xAxis)

    // 昼夜平滑过渡
    const target = params.timeOfDay === 'night' ? 1 : 0
    const step = delta / Math.max(V.transitionSeconds, 1e-3)
    night.current += MathUtils.clamp(target - night.current, -step, step)

    const maxDepth = Math.max(...cityLayers.map((l) => l.material.userData.depth as number))
    projectWindow(rect, maxDepth + 1, dir, sky.geometry.attributes.position.array as Float32Array)
    sky.geometry.attributes.position.needsUpdate = true
    sky.material.uniforms.uNight.value = night.current

    for (const l of cityLayers) {
      const ud = l.material.userData
      const u = l.material.uniforms
      if (!ud.baseReady) {
        u.uBaseY.value = hitHeight(rect, ud.depth, dir0, l.cfg.skylineAt) - ud.meanRoof * l.cfg.height
        ud.baseReady = true
      }
      projectWindow(rect, ud.depth, dir, l.geometry.attributes.position.array as Float32Array)
      l.geometry.attributes.position.needsUpdate = true
      // 受控视差：相对默认视角的位移，只保留 parallax 比例
      projectionShift(ud.depth, dir, shift)
      projectionShift(ud.depth, dir0, shift0)
      const keep = 1 - l.cfg.parallax
      u.uShift.value.set((shift.x - shift0.x) * keep, (shift.y - shift0.y) * keep)
      // 楼往后（离墙更远）挤出最深的那栋楼的进深：在这一层平面上的位移 = 视线的横向分量 × 进深 / |视线纵深分量|
      const fullDepth = ud.fullDepth as number
      projectionShift(fullDepth, dir, shift)
      const len = Math.hypot(shift.x, shift.y)
      const k = len > V.extrudeMax ? V.extrudeMax / len : 1
      u.uExtrude.value.set(-shift.x * k, -shift.y * k)
      // 挤出被限长时，侧面开窗用的进深也按同样比例缩短
      u.uExtrudeDepth.value = fullDepth * k
      u.uNight.value = night.current
      u.uOffset.value = along
      u.uTime.value = clock.elapsedTime
      u.uDetail.value = detail
    }
  })

  const fw = W.frameWidth
  const fd = W.frameDepth
  const midZ = -wallThickness / 2
  const frameColor = palette.slate

  return (
    <group ref={group} position={[dx, 0, 0]}>
      {/* 窗外：编辑器里不参与点击和包围盒 */}
      <group userData={{ editorIgnore: true }}>
        <mesh geometry={sky.geometry} material={sky.material} frustumCulled={false} raycast={noRaycast} />
        {cityLayers.map((l) => (
          <mesh key={l.i} geometry={l.geometry} material={l.material} frustumCulled={false} raycast={noRaycast} />
        ))}
      </group>

      {/* 窗框：两侧、上下、中竖框 */}
      {[-1, 1].map((s) => (
        <BevelBox
          key={s}
          tier="rod"
          size={[fw, height, fd]}
          position={[s * (width / 2 - fw / 2), W.sillHeight + height / 2, midZ]}
          color={frameColor}
        />
      ))}
      <BevelBox tier="rod" size={[width, fw, fd]} position={[0, W.headHeight - fw / 2, midZ]} color={frameColor} />
      <BevelBox tier="rod" size={[width, fw, fd]} position={[0, W.sillHeight + fw / 2, midZ]} color={frameColor} />
      <BevelBox tier="rod" size={[W.mullionWidth, height, fd]} position={[0, W.sillHeight + height / 2, midZ]} color={frameColor} />

      {/* 玻璃 */}
      <mesh position={[0, W.sillHeight + height / 2, midZ]} material={glass} renderOrder={5}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  )
}
