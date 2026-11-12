import { createContext, useContext } from 'react'
import { sceneConfig, type BuddyPose, type TimeOfDay } from '../config/sceneConfig'
import type { Quality } from './quality'

// 运行时可调的参数。默认值全部来自 sceneConfig；debug 面板会覆盖它们。

type Palette = { -readonly [K in keyof typeof sceneConfig.palette]: string }
type Lighting = { -readonly [K in keyof typeof sceneConfig.lighting.day]: (typeof sceneConfig.lighting.day)[K] extends string ? string : number }

export type CameraParams = {
  azimuthMinDeg: number
  azimuthMaxDeg: number
  minDepressionDeg: number
  maxDepressionDeg: number
  fullViewSize: number
  closeViewSize: number
  smoothTime: number
  draggingSmoothTime: number
  rotateSpeed: number
  truckSpeed: number
  dollySpeed: number
}

export type CityViewParams = {
  /** 用几层城市（从最近一层往远数） */
  layerCount: number
  depths: number[]
  litRatio: number
  twinkleRatio: number
  skyDayTop: string
  skyDayHorizon: string
  skyNightTop: string
  skyNightHorizon: string
  layerDay: string[]
  layerNight: string[]
  /** 楼的进深倍率、侧面暗度 */
  depthScale: number
  sideDarken: number
}

export type SceneParams = {
  timeOfDay: TimeOfDay
  palette: Palette
  bevel: number
  lighting: { day: Lighting; night: Lighting }
  ao: { intensity: number; radius: number }
  bloom: { intensity: number }
  mergeStatic: boolean
  quality: Quality
  cityView: CityViewParams
  emissive: { -readonly [K in keyof typeof sceneConfig.emissive]: number }
  camera: CameraParams
  buddy: {
    bodyColor: string
    eyeColor: string
    outline: boolean
    pose: BuddyPose
  }
}

export const defaultSceneParams: SceneParams = {
  timeOfDay: sceneConfig.defaultTimeOfDay,
  palette: { ...sceneConfig.palette },
  bevel: sceneConfig.bevel,
  lighting: {
    day: { ...sceneConfig.lighting.day },
    night: { ...sceneConfig.lighting.night },
  },
  ao: { intensity: sceneConfig.ao.intensity, radius: sceneConfig.ao.radius },
  bloom: { intensity: sceneConfig.bloom.intensity },
  mergeStatic: sceneConfig.performance.mergeStatic,
  quality: sceneConfig.performance.quality,
  cityView: {
    layerCount: sceneConfig.cityView.layers.length,
    depths: sceneConfig.cityView.layers.map((l) => l.depth),
    litRatio: sceneConfig.cityView.litRatio,
    twinkleRatio: sceneConfig.cityView.twinkleRatio,
    skyDayTop: sceneConfig.cityView.sky.day.top,
    skyDayHorizon: sceneConfig.cityView.sky.day.horizon,
    skyNightTop: sceneConfig.cityView.sky.night.top,
    skyNightHorizon: sceneConfig.cityView.sky.night.horizon,
    layerDay: sceneConfig.cityView.layers.map((l) => l.dayColor),
    layerNight: sceneConfig.cityView.layers.map((l) => l.nightColor),
    depthScale: sceneConfig.cityView.depthScale,
    sideDarken: sceneConfig.cityView.sideDarken,
  },
  emissive: { ...sceneConfig.emissive },
  camera: {
    azimuthMinDeg: sceneConfig.controls.azimuthMinDeg,
    azimuthMaxDeg: sceneConfig.controls.azimuthMaxDeg,
    minDepressionDeg: sceneConfig.controls.minDepressionDeg,
    maxDepressionDeg: sceneConfig.controls.maxDepressionDeg,
    fullViewSize: sceneConfig.camera.fullViewSize,
    closeViewSize: sceneConfig.camera.closeViewSize,
    smoothTime: sceneConfig.controls.smoothTime,
    draggingSmoothTime: sceneConfig.controls.draggingSmoothTime,
    rotateSpeed: sceneConfig.controls.rotateSpeed,
    truckSpeed: sceneConfig.controls.truckSpeed,
    dollySpeed: sceneConfig.controls.dollySpeed,
  },
  buddy: {
    bodyColor: sceneConfig.buddy.bodyColor,
    eyeColor: sceneConfig.buddy.eyeColor,
    outline: sceneConfig.buddy.outline,
    pose: sceneConfig.buddy.pose,
  },
}

export type Ctx = { params: SceneParams; setParams: (p: SceneParams) => void }

export const SceneParamsContext = createContext<Ctx | null>(null)

function useCtx() {
  const ctx = useContext(SceneParamsContext)
  if (!ctx) throw new Error('useSceneParams 必须在 SceneParamsProvider 内使用')
  return ctx
}

export function useSceneParams() {
  return useCtx().params
}

export function useSetSceneParams() {
  return useCtx().setParams
}

/** 当前时段的灯光参数 */
export function useLighting() {
  const p = useSceneParams()
  return p.lighting[p.timeOfDay]
}
