import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../config/sceneConfig'
import { CameraRig } from './CameraRig'
import { Effects } from './Effects'
import { Lighting } from './Lighting'
import { Room } from './room/Room'
import { DiningArea } from './furniture/DiningArea'
import { BarArea } from './bar/BarArea'
import { BarBuddy } from './character/BarBuddy'
import { DoubleTapReset } from './interaction/tap'

export function Scene() {
  const { canvas } = sceneConfig
  return (
    <Canvas
      dpr={[canvas.dprMin, canvas.dprMax]}
      // 色调映射交给后处理，渲染器本身不做
      flat
      shadows="percentage"
      gl={{ antialias: false }}
    >
      <Lighting />
      <CameraRig />
      <DoubleTapReset />
      <Room />
      <DiningArea />
      <BarArea />
      <BarBuddy />
      <Effects />
    </Canvas>
  )
}
