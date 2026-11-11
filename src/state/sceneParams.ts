import { createContext, useContext } from 'react'
import { sceneConfig, type BuddyPose, type TimeOfDay } from '../config/sceneConfig'

// 运行时可调的参数。默认值全部来自 sceneConfig；debug 面板会覆盖它们。

type Palette = { -readonly [K in keyof typeof sceneConfig.palette]: string }
type Lighting = { -readonly [K in keyof typeof sceneConfig.lighting.day]: (typeof sceneConfig.lighting.day)[K] extends string ? string : number }

export type CameraParams = {
  azimuthRangeDeg: number
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

export type SceneParams = {
  timeOfDay: TimeOfDay
  palette: Palette
  bevel: number
  lighting: { day: Lighting; night: Lighting }
  ao: { intensity: number; radius: number }
  bloom: { intensity: number }
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
  emissive: { ...sceneConfig.emissive },
  camera: {
    azimuthRangeDeg: sceneConfig.controls.azimuthRangeDeg,
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
