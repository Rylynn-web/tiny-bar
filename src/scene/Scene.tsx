import { Canvas } from '@react-three/fiber'
import { sceneConfig } from '../config/sceneConfig'
import { CameraRig } from './CameraRig'
import { TestBox } from './TestBox'

export function Scene() {
  const { canvas, lights } = sceneConfig
  return (
    <Canvas
      dpr={[canvas.dprMin, canvas.dprMax]}
      gl={{ antialias: canvas.antialias }}
    >
      <color attach="background" args={[canvas.background]} />
      <ambientLight color={lights.ambient.color} intensity={lights.ambient.intensity} />
      <directionalLight
        color={lights.directional.color}
        intensity={lights.directional.intensity}
        position={lights.directional.position}
      />
      <CameraRig />
      <TestBox />
    </Canvas>
  )
}
