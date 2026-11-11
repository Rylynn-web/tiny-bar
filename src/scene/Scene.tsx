import { Fragment } from 'react'
import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../config/sceneConfig'
import { useEditorBridge } from '../state/editorBridge'
import { useSceneParams } from '../state/sceneParams'
import { MergeStatic } from './primitives/MergeStatic'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { LayoutRenderer } from './LayoutRenderer'
import { Room } from './room/Room'
import { BarBuddy } from './character/BarBuddy'
import { DoubleTapReset } from './interaction/tap'

export function Scene() {
  const { canvas } = sceneConfig
  // 只有开发环境 ?edit 时才有编辑器；生产环境为 null
  const bridge = useEditorBridge()
  const params = useSceneParams()
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
        <DoubleTapReset />
        <MergeStatic enabled={params.mergeStatic} version={params}>
          <Room />
        </MergeStatic>
        <LayoutRenderer />
        <BarBuddy />
        {Extras && <Extras />}
        <Effects />
      </Root>
    </Canvas>
  )
}
