import { useMemo } from 'react'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Metal } from '../primitives/Metal'
import { CoffeeStation } from './CoffeeStation'

const B = sceneConfig.bar

/** 后操作台（地面物件）：柜体 + 木台面 + 水槽 + 水龙头 + 台面上的咖啡区。原点在底面中心，背面朝 -Z 贴墙 */
export function BackCounter() {
  const { palette } = useSceneParams()
  const c = B.backCounter
  const width = c.width
  const cx = 0
  const cz = 0
  const back = -c.depth / 2
  const bodyHeight = c.height - c.topThickness

  const sink = B.sink
  const sinkZ = c.depth / 2 - sink.frontMargin - sink.depth / 2

  const f = B.faucet
  const faucetGeometry = useMemo(() => {
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(0, f.height * 0.8, 0),
      new Vector3(0, f.height, f.reach * 0.35),
      new Vector3(0, f.height * 0.95, f.reach),
      new Vector3(0, f.height * 0.75, f.reach),
    ])
    return new TubeGeometry(curve, 24, f.radius, 8, false)
  }, [f.height, f.reach, f.radius])

  return (
    <group>
      <BevelBox size={[width, bodyHeight, c.depth]} position={[cx, bodyHeight / 2, cz]} color={palette.cream} />
      <BevelBox
        tier="small"
        size={[width, c.topThickness, c.depth]}
        position={[cx, c.height - c.topThickness / 2, cz]}
        color={palette.wood}
      />
      <BevelBox
        tier="rod"
        size={[sink.width, sink.plateThickness, sink.depth]}
        position={[sink.x, c.height + sink.plateThickness / 2, sinkZ]}
        color={palette.dark}
        castShadow={false}
      />
      <mesh geometry={faucetGeometry} position={[f.x, c.height, back + f.backOffset]} castShadow>
        <Metal />
      </mesh>
      <CoffeeStation />
    </group>
  )
}
