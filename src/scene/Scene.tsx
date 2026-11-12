import { Fragment, lazy, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../config/sceneConfig'
import { useEditorBridge } from '../state/editorBridge'
import { useSceneParams } from '../state/sceneParams'
import { useLayoutItems, useRoom } from '../state/layoutStore'
import { MergeStatic } from './primitives/MergeStatic'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { LayoutRenderer } from './LayoutRenderer'
import { Room } from './room/Room'
import { WallVisibilityDriver } from './room/WallVisibilityDriver'
import { Guests } from './character/Guests'
import { DoubleTapReset } from './interaction/tap'

// 脸部可见性检查：只在 ?debug 时加载
const isDebug = new URLSearchParams(window.location.search).has('debug')
const FaceCheck = isDebug ? lazy(() => import('./debug/FaceCheck')) : null

export function Scene() {
  const { canvas } = sceneConfig
  // 只有开发环境 ?edit 时才有编辑器；生产环境为 null
  const bridge = useEditorBridge()
  const params = useSceneParams()
  const items = useLayoutItems()
  const room = useRoom()
  // 窗户或房间尺寸变了，墙会重新开洞/变长，要跟着重新合并
  const roomKey = JSON.stringify([room, items.filter((i) => i.type === 'cityWindow')])
  const Root = bridge?.Root ?? Fragment
  const Extras = bridge?.SceneExtras

  return (
    <Canvas
      dpr={[canvas.dprMin, canvas.dprMax]}
      // 色调映射交给后处理，渲染器本身不做
      flat
      shadows="percentage"
      gl={{ antialias: false }}
      onPointerMissed={bridge?.onPointerMissed}
    >
      <Root>
        <Lighting />
        <CameraRig />
        <WallVisibilityDriver />
        <DoubleTapReset />
        <MergeStatic enabled={params.mergeStatic} version={params} extra={roomKey}>
          <Room />
        </MergeStatic>
        <LayoutRenderer />
        <Guests />
        {Extras && <Extras />}
        {FaceCheck && (
          <Suspense fallback={null}>
            <FaceCheck />
          </Suspense>
        )}
        <Effects />
      </Root>
    </Canvas>
  )
}
