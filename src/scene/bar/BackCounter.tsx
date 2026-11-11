import { useMemo } from 'react'
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Metal } from '../primitives/Metal'

const B = sceneConfig.bar
const wallZ = -sceneConfig.room.depth / 2

/** 后操作台：柜体 + 木台面 + 水槽 + 水龙头 */
export function BackCounter() {
  const { palette } = useSceneParams()
  const c = B.backCounter
  const width = c.xTo - c.xFrom
  const cx = (c.xFrom + c.xTo) / 2
  const cz = wallZ + c.depth / 2
  const bodyHeight = c.height - c.topThickness

  const sink = B.sink
  const sinkZ = wallZ + c.depth - sink.frontMargin - sink.depth / 2

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
      <mesh geometry={faucetGeometry} position={[f.x, c.height, wallZ + f.backOffset]} castShadow>
        <Metal />
      </mesh>
    </group>
  )
}
