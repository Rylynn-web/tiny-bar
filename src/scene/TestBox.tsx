import { RoundedBox } from '@react-three/drei'
import { sceneConfig } from '../config/sceneConfig'

export function TestBox() {
  const c = sceneConfig.testBox
  return (
    <RoundedBox
      args={c.size}
      radius={c.radius}
      smoothness={c.smoothness}
      position={c.position}
    >
      <meshStandardMaterial
        color={c.color}
        roughness={c.roughness}
        metalness={c.metalness}
      />
    </RoundedBox>
  )
}
