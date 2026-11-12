import { useState, type ReactNode } from 'react'
import { SceneParamsContext, defaultSceneParams } from './sceneParams'
import { useClockTimeOfDay } from './timezone'

/** 场景时段跟着访客时区的钟点走 */
function ClockTimeOfDay() {
  useClockTimeOfDay()
  return null
}

export function SceneParamsProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState(defaultSceneParams)
  return (
    <SceneParamsContext.Provider value={{ params, setParams }}>
      <ClockTimeOfDay />
      {children}
    </SceneParamsContext.Provider>
  )
}
