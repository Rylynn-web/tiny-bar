import { DoubleSide } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Glass } from '../primitives/Glass'
import { Matte } from '../primitives/Matte'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'

const B = sceneConfig.bar
const wallZ = -sceneConfig.room.depth / 2
const top = B.backCounter.height
const midZ = wallZ + B.backCounter.depth / 2

/** 后操作台上的咖啡区：意式咖啡机、两台磨豆机、手冲、小罐 */
export function CoffeeStation() {
  const { palette } = useSceneParams()
  const e = B.espresso
  const [ew, eh, ed] = e.size

  const g = B.grinders
  const [gw, gh, gd] = g.baseSize
  const hopperGeo = useLathe(g.hopper)

  const p = B.pourOver
  const kettleGeo = useLathe(p.kettle)
  const serverGeo = useLathe(p.server)
  const dripperGeo = useLathe(p.dripper)
  const kettleTop = Math.max(...p.kettle.map((v) => v[1]))
  const kettleR = Math.max(...p.kettle.map((v) => v[0]))
  const serverH = Math.max(...p.server.map((v) => v[1]))

  const j = B.jars
  const cupR = B.cup.profile[3][0]

  return (
    <group>
      {/* 意式咖啡机：深色机身 + 不锈钢前面板 + 冲煮头 + 接水盘 + 顶部温杯 */}
      <group position={[e.x, top, midZ]}>
        <BevelBox tier="small" size={[ew, eh, ed]} position={[0, eh / 2, 0]} color={palette.dark} />
        <BevelBox
          tier="rod"
          size={[ew * 0.92, e.panelHeight, e.panelDepth]}
          position={[0, eh - e.panelHeight / 2 - e.panelInset, ed / 2]}
          color={palette.steel}
          surface={<Metal />}
        />
        {[-1, 1].map((s) => (
          <RoundedCylinder
            key={s}
            radius={e.groupHeadRadius}
            height={e.groupHeadHeight}
            position={[(s * e.groupHeadSpacing) / 2, e.groupHeadY, ed / 2 + e.groupHeadRadius]}
            color={palette.steel}
            surface={<Metal />}
            tier="rod"
          />
        ))}
        <BevelBox
          tier="rod"
          size={[ew * 0.8, e.trayHeight, e.trayDepth]}
          position={[0, e.trayHeight / 2, ed / 2 + e.trayDepth / 2 - e.trayTuck]}
          color={palette.steel}
          surface={<Metal />}
        />
        {Array.from({ length: e.topCupCount }, (_, i) => (
          <RoundedCylinder
            key={i}
            radius={cupR}
            height={e.topCupHeight}
            position={[-ew / 2 + (ew / e.topCupCount) * (i + 0.5), eh, 0]}
            color={palette.cream}
            tier="rod"
            castShadow={false}
          />
        ))}
      </group>

      {/* 磨豆机：深色机身 + 半透明豆仓 */}
      {g.xs.map((x) => (
        <group key={x} position={[x, top, midZ]}>
          <BevelBox tier="small" size={[gw, gh, gd]} position={[0, gh / 2, 0]} color={palette.dark} />
          <mesh geometry={hopperGeo} position={[0, gh, 0]}>
            <Glass color={palette.dark} />
          </mesh>
        </group>
      ))}

      {/* 手冲：不锈钢细嘴壶 + 玻璃分享壶上的滤杯 */}
      <group position={[p.x, top, midZ]}>
        <mesh geometry={kettleGeo} castShadow>
          <Metal />
        </mesh>
        <mesh
          position={[kettleR + (p.spoutLength / 2) * Math.sin(p.spoutAngle), kettleTop * p.spoutHeightRatio, 0]}
          rotation={[0, 0, -p.spoutAngle]}
        >
          <capsuleGeometry args={[p.spoutRadius, p.spoutLength, 4, 8]} />
          <Metal />
        </mesh>
        <mesh geometry={serverGeo} position={[p.dripperX, 0, 0]}>
          <Glass color={palette.steel} />
        </mesh>
        <mesh geometry={dripperGeo} position={[p.dripperX, serverH, 0]} receiveShadow>
          <Matte color={palette.cream} shadowSide={DoubleSide} side={DoubleSide} />
        </mesh>
      </group>

      {/* 小罐：不锈钢与奶白交替 */}
      {Array.from({ length: j.count }, (_, i) => {
        const steel = i % 2 === 0
        return (
          <RoundedCylinder
            key={i}
            radius={j.radius}
            height={j.heights[i % j.heights.length]}
            position={[j.xFrom + j.spacing * i, top, midZ]}
            color={palette.cream}
            surface={steel ? <Metal /> : undefined}
            tier="rod"
            castShadow={false}
          />
        )
      })}
    </group>
  )
}
