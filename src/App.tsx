import { lazy, Suspense } from 'react'
import { Scene } from './scene/Scene'
import { SceneParamsProvider } from './state/SceneParamsProvider'
import { ResetViewButton } from './ui/ResetViewButton'

// 只有带 ?debug 时才加载 leva 面板代码
const isDebug = new URLSearchParams(window.location.search).has('debug')
const DebugPanel = isDebug ? lazy(() => import('./ui/DebugPanel')) : null

// 布局编辑器：只在开发环境 + ?edit 时加载。生产构建里 import.meta.env.DEV 为 false，整段会被删掉
const isEdit = import.meta.env.DEV && new URLSearchParams(window.location.search).has('edit')
const EditorShell = isEdit ? lazy(() => import('./ui/editor/EditorShell')) : null

export default function App() {
  return (
    <SceneParamsProvider>
      {EditorShell ? (
        <Suspense fallback={null}>
          <EditorShell />
        </Suspense>
      ) : (
        <Scene />
      )}
      <ResetViewButton />
      {DebugPanel && (
        <Suspense fallback={null}>
          <DebugPanel />
        </Suspense>
      )}
    </SceneParamsProvider>
  )
}
