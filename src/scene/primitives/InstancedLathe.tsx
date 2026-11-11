import { Instance, Instances } from '@react-three/drei'
import type { BufferGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

export type InstanceItem = {
  position: [number, number, number]
  rotationY?: number
  color: string
}

type Props = {
  geometry: BufferGeometry
  items: InstanceItem[]
}

/** 同一几何体的多个实例：一次绘制调用，按实例着色。小物件只接收阴影、不投影 */
export function InstancedMatte({ geometry, items }: Props) {
  const m = sceneConfig.material
  return (
    <Instances geometry={geometry} limit={items.length} range={items.length} receiveShadow castShadow={false}>
      <meshStandardMaterial
        color={m.instanceBase}
        roughness={m.roughness}
        metalness={0}
        envMapIntensity={m.envMapIntensity}
      />
      {items.map((it, i) => (
        <Instance key={i} position={it.position} rotation={[0, it.rotationY ?? 0, 0]} color={it.color} />
      ))}
    </Instances>
  )
}
