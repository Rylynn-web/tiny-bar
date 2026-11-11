import { useMemo } from 'react'
import { CurvePath, ExtrudeGeometry, LineCurve3, Shape, TubeGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Glow } from '../primitives/Glow'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { getLathe } from '../primitives/useLathe'

const B = sceneConfig.bar
const C = B.counter
const ARC_STEPS = 12

/**
 * L 形吧台的底面轮廓（形状平面的 y = 世界的 -z）。o 为向外扩的距离（台面出檐用）。
 * 长边沿 X，右端圆角折回后墙方向，左端开口。
 */
// 局部坐标：长边正面在 z=0，x 从 -length/2 到 length/2，折回段到 z=-returnDepth
const X_FROM = -C.length / 2
const X_TO = C.length / 2
const FRONT_Z = 0
const RETURN_Z = -C.returnDepth

function lShape(o: number) {
  const xa = X_FROM - o
  const xb = X_TO + o
  const zf = FRONT_Z + o
  const zr = RETURN_Z - o
  const xi = X_TO - C.depth - o
  const zi = FRONT_Z - C.depth - o
  const r = C.cornerRadius + o
  const s = new Shape()
  s.moveTo(xa, -zf)
  s.lineTo(xb - r, -zf)
  s.absarc(xb - r, -zf + r, r, -Math.PI / 2, 0, false)
  s.lineTo(xb, -zr)
  s.lineTo(xi, -zr)
  s.lineTo(xi, -zi)
  s.lineTo(xa, -zi)
  s.closePath()
  return s
}

function extrudeUp(shape: Shape, height: number, bevel: number) {
  return new ExtrudeGeometry(shape, {
    depth: Math.max(height - 2 * bevel, 1e-3),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 16,
  })
}

/** 灯带路径：沿台面外沿下方，从左端经圆角到折回段末端 */
function ledPath(y: number, o: number) {
  const r = C.cornerRadius + o
  const pts: Vector3[] = [new Vector3(X_FROM, y, FRONT_Z + o), new Vector3(X_TO + o - r, y, FRONT_Z + o)]
  const cx = X_TO + o - r
  const cz = FRONT_Z + o - r
  for (let i = 1; i <= ARC_STEPS; i++) {
    const a = (i / ARC_STEPS) * (Math.PI / 2)
    pts.push(new Vector3(cx + r * Math.sin(a), y, cz + r * Math.cos(a)))
  }
  pts.push(new Vector3(X_TO + o, y, RETURN_Z))
  const path = new CurvePath<Vector3>()
  for (let i = 0; i < pts.length - 1; i++) path.add(new LineCurve3(pts[i], pts[i + 1]))
  return path
}

/** L 形吧台（地面物件）：粉色立面 + 深蓝台面 + 外沿灯带 + 收银机等小物 + 摇酒壶。原点在长边正面中点 */
export function BarCounter() {
  const { palette, bevel } = useSceneParams()
  const b = bevel * sceneConfig.bevelTiers.small
  const bodyHeight = C.height - C.topThickness

  const { body, top, led } = useMemo(() => {
    const body = extrudeUp(lShape(0), bodyHeight, b)
    const top = extrudeUp(lShape(C.overhang), C.topThickness, b)
    const led = new TubeGeometry(
      ledPath(bodyHeight - B.ledStrip.belowTop, C.overhang * B.ledStrip.outset),
      96,
      B.ledStrip.radius,
      6,
      false,
    )
    return { body, top, led }
  }, [b, bodyHeight])

  const pos = B.pos
  const midZ = FRONT_Z - C.depth / 2
  const sh = B.shakers

  return (
    <group>
      <mesh geometry={body} rotation={[-Math.PI / 2, 0, 0]} position={[0, b, 0]} castShadow receiveShadow>
        <Matte color={palette.blush} />
      </mesh>
      <mesh
        geometry={top}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, bodyHeight + b, 0]}
        castShadow
        receiveShadow
      >
        <Matte color={palette.navy} />
      </mesh>
      <mesh geometry={led}>
        <Glow color={palette.warmLight} group="ledStrip" />
      </mesh>

      {/* 收银机、刷卡机、纸巾盒 */}
      <group position={[pos.x, C.height, midZ]}>
        <BevelBox tier="rod" size={pos.baseSize} position={[0, pos.baseSize[1] / 2, 0]} color={palette.dark} />
        <group position={[0, pos.baseSize[1] + pos.screenSize[1] / 2, 0]} rotation={[-pos.screenTilt, 0, 0]}>
          <BevelBox tier="rod" size={pos.screenSize} color={palette.dark} />
          <mesh position={[0, 0, pos.screenSize[2] / 2 + 1e-3]}>
            <planeGeometry args={[pos.screenSize[0] * 0.86, pos.screenSize[1] * 0.8]} />
            <Glow color={palette.steel} group="screen" />
          </mesh>
        </group>
        <BevelBox
          tier="rod"
          size={pos.readerSize}
          position={[pos.readerOffset, pos.readerSize[1] / 2, 0]}
          color={palette.dark}
          castShadow={false}
        />
        <BevelBox
          tier="rod"
          size={pos.napkinSize}
          position={[pos.napkinOffset, pos.napkinSize[1] / 2, 0]}
          color={palette.cream}
          castShadow={false}
        />
      </group>

      {/* 摇酒壶 ×3 + 一个深色小瓶 */}
      {sh.xs.map((x) => (
        <mesh key={x} geometry={getLathe(sh.profile, sceneConfig.detail.smallLatheSegments)} position={[x, C.height, midZ]} receiveShadow>
          <Metal />
        </mesh>
      ))}
      <mesh geometry={getLathe(B.bottles.profiles[0], sceneConfig.detail.smallLatheSegments)} position={[sh.bottleX, C.height, midZ]} receiveShadow>
        <Matte color={palette.dark} />
      </mesh>
    </group>
  )
}
