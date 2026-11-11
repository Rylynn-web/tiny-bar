import { useEffect } from 'react'
import { Leva, folder, useControls } from 'leva'
import { defaultSceneParams, useSetSceneParams, type SceneParams } from '../state/sceneParams'

// 只在网址带 ?debug 时按需加载。初始值全部来自 sceneConfig（经 defaultSceneParams）。

const d = defaultSceneParams

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
    时段: {
      value: d.timeOfDay,
      options: { 白天: 'day', 夜晚: 'night' },
    },
    小人: folder({
      pose: { value: d.buddy.pose, options: { 坐: 'sit', 站: 'stand' }, label: '姿势' },
      outline: { value: d.buddy.outline, label: '描边' },
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
    }),
    造型: folder({
      bevel: { value: d.bevel, min: 0, max: 0.08, step: 0.002, label: '倒角半径' },
    }),
    自发光: folder({
      emBulb: { value: d.emissive.bulb, min: 0, max: 20, step: 0.5, label: '灯泡' },
      emLed: { value: d.emissive.ledStrip, min: 0, max: 20, step: 0.5, label: '灯带' },
      emScreen: { value: d.emissive.screen, min: 0, max: 10, step: 0.1, label: '屏幕' },
      emLamp: { value: d.emissive.lamp, min: 0, max: 20, step: 0.5, label: '台灯' },
      emPool: { value: d.emissive.pool, min: 0, max: 1, step: 0.05, label: '光斑' },
    }),
    Bloom: folder({
      bloomIntensity: { value: d.bloom.intensity, min: 0, max: 3, step: 0.05, label: '强度' },
    }),
    AO: folder({
      aoIntensity: { value: d.ao.intensity, min: 0, max: 8, step: 0.1, label: '强度' },
      aoRadius: { value: d.ao.radius, min: 0.05, max: 2, step: 0.01, label: '半径' },
    }),
    相机: folder({
      azimuthRangeDeg: { value: d.camera.azimuthRangeDeg, min: 0, max: 45, step: 1, label: '水平±°' },
      minDepressionDeg: { value: d.camera.minDepressionDeg, min: 5, max: 85, step: 1, label: '俯角下限°' },
      maxDepressionDeg: { value: d.camera.maxDepressionDeg, min: 5, max: 89, step: 1, label: '俯角上限°' },
      fullViewSize: { value: d.camera.fullViewSize, min: 2, max: 12, step: 0.1, label: '全景视野' },
      closeViewSize: { value: d.camera.closeViewSize, min: 0.5, max: 5, step: 0.1, label: '近景视野' },
      smoothTime: { value: d.camera.smoothTime, min: 0, max: 1.5, step: 0.01, label: '松手阻尼' },
      draggingSmoothTime: { value: d.camera.draggingSmoothTime, min: 0, max: 0.6, step: 0.01, label: '拖动阻尼' },
      rotateSpeed: { value: d.camera.rotateSpeed, min: 0.1, max: 2, step: 0.05, label: '旋转速度' },
      truckSpeed: { value: d.camera.truckSpeed, min: 0.1, max: 3, step: 0.05, label: '平移速度' },
      dollySpeed: { value: d.camera.dollySpeed, min: 0.1, max: 3, step: 0.05, label: '缩放速度' },
    }),
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
      emissive: {
        bulb: v.emBulb as number,
        ledStrip: v.emLed as number,
        screen: v.emScreen as number,
        lamp: v.emLamp as number,
        pool: v.emPool as number,
      },
      camera: {
        azimuthRangeDeg: v.azimuthRangeDeg as number,
        minDepressionDeg: v.minDepressionDeg as number,
        maxDepressionDeg: v.maxDepressionDeg as number,
        fullViewSize: v.fullViewSize as number,
        closeViewSize: v.closeViewSize as number,
        smoothTime: v.smoothTime as number,
        draggingSmoothTime: v.draggingSmoothTime as number,
        rotateSpeed: v.rotateSpeed as number,
        truckSpeed: v.truckSpeed as number,
        dollySpeed: v.dollySpeed as number,
      },
      buddy: {
        bodyColor: v.bodyColor as string,
        eyeColor: v.eyeColor as string,
        outline: v.outline as boolean,
        pose: v.pose as SceneParams['buddy']['pose'],
      },
    })
    // v 每次渲染都是新对象，用序列化后的 key 判断是否真的变了
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setParams])

  return <Leva collapsed={false} titleBar={{ title: '小酒馆 · 调参' }} />
}
