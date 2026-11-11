import { useMemo } from 'react'
import { BufferGeometry, ExtrudeGeometry, Quaternion, Shape, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'

const C = sceneConfig.shellChair

function roundedRect(w: number, h: number, r: number, roundBottom: boolean) {
  const s = new Shape()
  const x0 = -w / 2
  const x1 = w / 2
  const rb = roundBottom ? r : 0
  s.moveTo(x0 + rb, 0)
  s.lineTo(x1 - rb, 0)
  if (rb) s.quadraticCurveTo(x1, 0, x1, rb)
  s.lineTo(x1, h - r)
  s.quadraticCurveTo(x1, h, x1 - r, h)
  s.lineTo(x0 + r, h)
  s.quadraticCurveTo(x0, h, x0, h - r)
  s.lineTo(x0, rb)
  if (rb) s.quadraticCurveTo(x0, 0, x0 + rb, 0)
  return s
}

function extrude(shape: Shape, bevel: number, steps = 1) {
  const b = Math.min(bevel, C.shellThickness / 2 - 1e-3)
  return new ExtrudeGeometry(shape, {
    depth: C.shellThickness - 2 * b,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 3,
    curveSegments: 8,
    steps,
  })
}

/** 把靠背绕前方的竖轴弯曲，两侧向前包，形成壳形 */
function bend(geometry: BufferGeometry, radius: number) {
  const pos = geometry.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const z = pos.getZ(i)
    const theta = x / radius
    const rr = radius - z
    pos.setXYZ(i, rr * Math.sin(theta), pos.getY(i), radius - rr * Math.cos(theta))
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

// 所有椅子共用同一套几何体（按倒角值缓存）
const cache = new Map<number, { seat: BufferGeometry; back: BufferGeometry }>()
function getChairGeometry(bevel: number) {
  let g = cache.get(bevel)
  if (!g) {
    const seat = extrude(roundedRect(C.seatWidth, C.seatDepth, C.seatCornerRadius, true), bevel)
    // 座面形状以 y=0 为后沿，居中到原点
    seat.translate(0, -C.seatDepth / 2, 0)
    const backShape = roundedRect(C.seatWidth, C.backHeight, C.backCornerRadius, false)
    const back = bend(extrude(backShape, bevel, 1), C.backBendRadius)
    g = { seat, back }
    cache.set(bevel, g)
  }
  return g
}

// 四条腿：从座面四角往下，向外张开
const up = new Vector3(0, 1, 0)
const legTop = C.seatHeight - C.shellThickness
const legs = [
  [-1, -1],
  [1, -1],
  [-1, 1],
  [1, 1],
].map(([sx, sz]) => {
  const top = new Vector3(sx * (C.seatWidth / 2 - C.legInset), legTop, sz * (C.seatDepth / 2 - C.legInset))
  const bottom = new Vector3(top.x + sx * C.legSplay, 0, top.z + sz * C.legSplay)
  const dir = new Vector3().subVectors(top, bottom)
  const length = dir.length()
  const mid = new Vector3().addVectors(top, bottom).multiplyScalar(0.5)
  const quaternion = new Quaternion().setFromUnitVectors(up, dir.normalize())
  return { mid, quaternion, length }
})

type Props = {
  color: string
  position?: [number, number, number]
  rotationY?: number
}

/** 壳形椅：一体感的座面 + 弯曲靠背 + 四条不锈钢细腿。局部 +Z 为正面，原点在地面 */
export function ShellChair({ color, position, rotationY = 0 }: Props) {
  const { bevel } = useSceneParams()
  const g = getChairGeometry(bevel * sceneConfig.bevelTiers.small)
  const material = useMemo(() => <Matte color={color} />, [color])

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* 座面：形状平面转到水平，向上拉伸出厚度 */}
      <mesh geometry={g.seat} rotation={[-Math.PI / 2, 0, 0]} position={[0, legTop, 0]} castShadow receiveShadow>
        {material}
      </mesh>
      {/* 靠背：底边落在座面后沿，向后仰 */}
      <mesh
        geometry={g.back}
        position={[0, C.seatHeight - C.shellThickness, -C.seatDepth / 2]}
        rotation={[-C.backTilt, 0, 0]}
        castShadow
        receiveShadow
      >
        {material}
      </mesh>
      {legs.map((l, i) => (
        <mesh key={i} position={l.mid} quaternion={l.quaternion} castShadow>
          <cylinderGeometry args={[C.legRadius, C.legRadius, l.length, 8]} />
          <Metal />
        </mesh>
      ))}
    </group>
  )
}
