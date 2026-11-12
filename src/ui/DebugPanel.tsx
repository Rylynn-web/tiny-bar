import { useEffect } from 'react'
import { Leva, folder, useControls } from 'leva'
import { GuestDebug } from './GuestDebug'
import { defaultSceneParams, useSetSceneParams, type SceneParams } from '../state/sceneParams'

// 只在网址带 ?debug 时按需加载。初始值全部来自 sceneConfig（经 defaultSceneParams）。

const d = defaultSceneParams

const emissiveLabels: Record<keyof typeof d.emissive, string> = {
  bulb: '吊灯灯泡',
  floorLamp: '落地弧灯',
  mushroomLamp: '蘑菇台灯',
  stackLamp: '叠环台灯',
  sconce: '球壁灯',
  ledStrip: '吧台灯带',
  screen: '收银屏幕',
  pool: '吊灯光斑',
  poolFloorLamp: '落地灯光斑',
  poolMushroom: '台灯光斑',
  conePendant: '吊灯光锥',
  coneFloorLamp: '落地灯光锥',
}

function lightingFolder(key: 'day' | 'night') {
  const l = d.lighting[key]
  return {
    [`${key}.background`]: { value: l.background, label: '背景' },
    [`${key}.sunColor`]: { value: l.sunColor, label: '主光颜色' },
    [`${key}.sunIntensity`]: { value: l.sunIntensity, min: 0, max: 6, step: 0.05, label: '主光强度' },
    [`${key}.ambientSky`]: { value: l.ambientSky, label: '环境光(天)' },
    [`${key}.ambientGround`]: { value: l.ambientGround, label: '环境光(地)' },
    [`${key}.ambientIntensity`]: { value: l.ambientIntensity, min: 0, max: 6, step: 0.05, label: '环境光强度' },
    [`${key}.glow`]: { value: l.glow, min: 0, max: 3, step: 0.05, label: '自发光倍率' },
  }
}

function pick(v: Record<string, unknown>, key: 'day' | 'night'): SceneParams['lighting']['day'] {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(d.lighting[key])) out[k] = v[`${key}.${k}`]
  return out as SceneParams['lighting']['day']
}

export default function DebugPanel() {
  const setParams = useSetSceneParams()

  const v = useControls({
    小人: folder({
      bodyColor: { value: d.buddy.bodyColor, label: '身体' },
      eyeColor: { value: d.buddy.eyeColor, label: '眼睛' },
    }),
    配色: folder({
      wall: { value: d.palette.wall, label: '墙' },
      wood: { value: d.palette.wood, label: '木头' },
      sage: { value: d.palette.sage, label: '鼠尾草绿' },
      terracotta: { value: d.palette.terracotta, label: '陶土红' },
      dark: { value: d.palette.dark, label: '深色' },
      warmLight: { value: d.palette.warmLight, label: '暖光' },
      concrete: { value: d.palette.concrete, label: '水泥地' },
      slate: { value: d.palette.slate, label: '石板灰' },
      baseboard: { value: d.palette.baseboard, label: '踢脚线' },
      cream: { value: d.palette.cream, label: '奶白' },
      navy: { value: d.palette.navy, label: '深蓝' },
      rust: { value: d.palette.rust, label: '锈红' },
      blush: { value: d.palette.blush, label: '粉' },
      pendantGreen: { value: d.palette.pendantGreen, label: '吊灯绿' },
      steel: { value: d.palette.steel, label: '不锈钢' },
      brass: { value: d.palette.brass, label: '黄铜' },
      orange: { value: d.palette.orange, label: '橙' },
      leaf: { value: d.palette.leaf, label: '叶子' },
      leafDark: { value: d.palette.leafDark, label: '深色叶子' },
      accentCobalt: { value: d.palette.accentCobalt, label: '强调·钴蓝' },
      accentVermilion: { value: d.palette.accentVermilion, label: '强调·橘红' },
      accentGrass: { value: d.palette.accentGrass, label: '强调·草绿' },
      accentLemon: { value: d.palette.accentLemon, label: '强调·柠檬黄' },
      accentPink: { value: d.palette.accentPink, label: '强调·粉' },
      accentCyan: { value: d.palette.accentCyan, label: '强调·青蓝' },
    }),
    造型: folder({
      bevel: { value: d.bevel, min: 0, max: 0.08, step: 0.002, label: '倒角半径' },
    }),
    // 每种灯分开调：发光强度、光斑浓度、光锥浓度
    自发光: folder(
      Object.fromEntries(
        (Object.keys(d.emissive) as (keyof typeof d.emissive)[]).map((k) => {
          const fx = k.startsWith('pool') || k.startsWith('cone')
          return [`em_${k}`, { value: d.emissive[k], min: 0, max: fx ? 1 : 20, step: fx ? 0.01 : 0.5, label: emissiveLabels[k] }]
        }),
      ),
    ),
    性能: folder({
      mergeStatic: { value: d.mergeStatic, label: '合并网格' },
      quality: { value: d.quality, options: { 自动: 'auto', 高: 'high', 低: 'low' }, label: '画质' },
    }),
    窗外: folder(
      {
        cvLayers: { value: d.cityView.layerCount, min: 1, max: d.cityView.depths.length, step: 1, label: '城市层数' },
        ...Object.fromEntries(
          d.cityView.depths.map((v, i) => [`cvDepth${i}`, { value: v, min: 0.5, max: 30, step: 0.5, label: `第${i + 1}层深度` }]),
        ),
        cvLit: { value: d.cityView.litRatio, min: 0, max: 1, step: 0.01, label: '窗灯比例' },
        cvTwinkle: { value: d.cityView.twinkleRatio, min: 0, max: 0.3, step: 0.01, label: '亮灭比例' },
        cvDepthScale: { value: d.cityView.depthScale, min: 0.5, max: 4, step: 0.1, label: '楼体进深' },
        cvSideDarken: { value: d.cityView.sideDarken, min: 0, max: 0.6, step: 0.01, label: '侧面暗度' },
        cvSkyDayTop: { value: d.cityView.skyDayTop, label: '白天天顶' },
        cvSkyDayHorizon: { value: d.cityView.skyDayHorizon, label: '白天地平线' },
        cvSkyNightTop: { value: d.cityView.skyNightTop, label: '夜晚天顶' },
        cvSkyNightHorizon: { value: d.cityView.skyNightHorizon, label: '夜晚地平线' },
        ...Object.fromEntries(
          d.cityView.layerDay.flatMap((c, i) => [
            [`cvDay${i}`, { value: c, label: `第${i + 1}层·白天` }],
            [`cvNight${i}`, { value: d.cityView.layerNight[i], label: `第${i + 1}层·夜晚` }],
          ]),
        ),
      },
      { collapsed: true },
    ),
    Bloom: folder({
      bloomIntensity: { value: d.bloom.intensity, min: 0, max: 3, step: 0.05, label: '强度' },
    }),
    AO: folder({
      aoIntensity: { value: d.ao.intensity, min: 0, max: 8, step: 0.1, label: '强度' },
      aoRadius: { value: d.ao.radius, min: 0.05, max: 2, step: 0.01, label: '半径' },
    }),
    相机: folder({
      azimuthMinDeg: { value: d.camera.azimuthMinDeg, min: -89, max: 0, step: 1, label: '水平最左°' },
      azimuthMaxDeg: { value: d.camera.azimuthMaxDeg, min: 0, max: 89, step: 1, label: '水平最右°' },
      minDepressionDeg: { value: d.camera.minDepressionDeg, min: 5, max: 85, step: 1, label: '俯角下限°' },
      maxDepressionDeg: { value: d.camera.maxDepressionDeg, min: 5, max: 89, step: 1, label: '俯角上限°' },
      fullViewSize: { value: d.camera.fullViewSize, min: 2, max: 12, step: 0.1, label: '全景视野' },
      closeViewSize: { value: d.camera.closeViewSize, min: 0.5, max: 5, step: 0.1, label: '近景视野' },
      smoothTime: { value: d.camera.smoothTime, min: 0, max: 1.5, step: 0.01, label: '松手阻尼' },
      draggingSmoothTime: { value: d.camera.draggingSmoothTime, min: 0, max: 0.6, step: 0.01, label: '拖动阻尼' },
      rotateSpeed: { value: d.camera.rotateSpeed, min: 0.1, max: 2, step: 0.05, label: '旋转速度' },
      truckSpeed: { value: d.camera.truckSpeed, min: 0.1, max: 3, step: 0.05, label: '平移速度' },
      dollySpeed: { value: d.camera.dollySpeed, min: 0.1, max: 3, step: 0.05, label: '缩放速度' },
      touchDollySpeed: { value: d.camera.touchDollySpeed, min: 0.1, max: 4, step: 0.05, label: '手机缩放速度' },
    }),
    // 白天 / 夜晚切换和两套灯光放在一起
    时段: {
      value: d.timeOfDay,
      options: { 白天: 'day', 夜晚: 'night' },
    },
    白天灯光: folder(lightingFolder('day'), { collapsed: true }),
    夜晚灯光: folder(lightingFolder('night'), { collapsed: true }),
  }) as Record<string, unknown>

  const key = JSON.stringify(v)
  useEffect(() => {
    setParams({
      timeOfDay: v['时段'] as SceneParams['timeOfDay'],
      palette: Object.fromEntries(
        Object.keys(d.palette).map((k) => [k, v[k] as string]),
      ) as SceneParams['palette'],
      bevel: v.bevel as number,
      lighting: { day: pick(v, 'day'), night: pick(v, 'night') },
      ao: { intensity: v.aoIntensity as number, radius: v.aoRadius as number },
      bloom: { intensity: v.bloomIntensity as number },
      mergeStatic: v.mergeStatic as boolean,
      quality: v.quality as SceneParams['quality'],
      cityView: {
        layerCount: v.cvLayers as number,
        depths: d.cityView.depths.map((_, i) => v[`cvDepth${i}`] as number),
        litRatio: v.cvLit as number,
        twinkleRatio: v.cvTwinkle as number,
        depthScale: v.cvDepthScale as number,
        sideDarken: v.cvSideDarken as number,
        skyDayTop: v.cvSkyDayTop as string,
        skyDayHorizon: v.cvSkyDayHorizon as string,
        skyNightTop: v.cvSkyNightTop as string,
        skyNightHorizon: v.cvSkyNightHorizon as string,
        layerDay: d.cityView.layerDay.map((_, i) => v[`cvDay${i}`] as string),
        layerNight: d.cityView.layerNight.map((_, i) => v[`cvNight${i}`] as string),
      },
      emissive: Object.fromEntries(
        Object.keys(d.emissive).map((k) => [k, v[`em_${k}`] as number]),
      ) as SceneParams['emissive'],
      camera: {
        azimuthMinDeg: v.azimuthMinDeg as number,
        azimuthMaxDeg: v.azimuthMaxDeg as number,
        minDepressionDeg: v.minDepressionDeg as number,
        maxDepressionDeg: v.maxDepressionDeg as number,
        fullViewSize: v.fullViewSize as number,
        closeViewSize: v.closeViewSize as number,
        smoothTime: v.smoothTime as number,
        draggingSmoothTime: v.draggingSmoothTime as number,
        rotateSpeed: v.rotateSpeed as number,
        truckSpeed: v.truckSpeed as number,
        dollySpeed: v.dollySpeed as number,
        touchDollySpeed: v.touchDollySpeed as number,
      },
      buddy: {
        bodyColor: v.bodyColor as string,
        eyeColor: v.eyeColor as string,
      },
    })
    // v 每次渲染都是新对象，用序列化后的 key 判断是否真的变了
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setParams])

  return (
    <>
      <GuestDebug />
      <Leva collapsed={false} titleBar={{ title: '小酒馆 · 调参' }} />
    </>
  )
}
