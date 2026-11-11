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
    [`${key}.ambientIntensity`]: { value: l.ambientIntensity, min: 0, max: 3, step: 0.05, label: '环境光强度' },
    [`${key}.lampIntensity`]: { value: l.lampIntensity, min: 0, max: 40, step: 0.5, label: '吊灯强度' },
    [`${key}.bulbGlow`]: { value: l.bulbGlow, min: 0, max: 10, step: 0.1, label: '灯泡发光' },
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
    }),
    造型: folder({
      bevel: { value: d.bevel, min: 0, max: 0.08, step: 0.002, label: '倒角半径' },
    }),
    AO: folder({
      aoIntensity: { value: d.ao.intensity, min: 0, max: 8, step: 0.1, label: '强度' },
      aoRadius: { value: d.ao.radius, min: 0.05, max: 2, step: 0.01, label: '半径' },
    }),
    相机: folder({
      viewSize: { value: d.viewSize, min: 2, max: 10, step: 0.1, label: '视野(小=近)' },
    }),
    白天灯光: folder(lightingFolder('day'), { collapsed: true }),
    夜晚灯光: folder(lightingFolder('night'), { collapsed: true }),
  }) as Record<string, unknown>

  const key = JSON.stringify(v)
  useEffect(() => {
    setParams({
      timeOfDay: v['时段'] as SceneParams['timeOfDay'],
      palette: {
        wall: v.wall as string,
        wood: v.wood as string,
        sage: v.sage as string,
        terracotta: v.terracotta as string,
        dark: v.dark as string,
        warmLight: v.warmLight as string,
      },
      bevel: v.bevel as number,
      lighting: { day: pick(v, 'day'), night: pick(v, 'night') },
      ao: { intensity: v.aoIntensity as number, radius: v.aoRadius as number },
      viewSize: v.viewSize as number,
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
