import { lazy, Suspense } from 'react'
import { Scene } from './scene/Scene'
import { SceneParamsProvider } from './state/SceneParamsProvider'
import { ResetViewButton } from './ui/ResetViewButton'

// 只有带 ?debug 时才加载 leva 面板代码
const isDebug = new URLSearchParams(window.location.search).has('debug')
const DebugPanel = isDebug ? lazy(() => import('./ui/DebugPanel')) : null

export default function App() {
  return (
    <SceneParamsProvider>
      <Scene />
      <ResetViewButton />
      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </SceneParamsProvider>
  )
}
