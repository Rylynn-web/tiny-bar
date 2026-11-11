import { useState, type ReactNode } from 'react'
import { SceneParamsContext, defaultSceneParams } from './sceneParams'

export function SceneParamsProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useState(defaultSceneParams)
  return (
    <SceneParamsContext.Provider value={{ params, setParams }}>
      {children}
    </SceneParamsContext.Provider>
  )
}
