import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Matte } from '../primitives/Matte'
import { Door } from './Door'

/** 斜角水泥地面 + 后墙/左墙 + 墙顶压边 + 踢脚线 + 门 */
export function Room() {
  const { palette, bevel } = useSceneParams()
  const r = sceneConfig.room
  const hw = r.width / 2
  const hd = r.depth / 2
  const wallFullHeight = r.wallHeight + r.floorThickness
  const wallCenterY = r.wallHeight - wallFullHeight / 2
  const trimY = r.wallHeight + r.trimHeight / 2
  const trimT = r.wallThickness + r.trimOverhang * 2

  // 地面：轮廓在 XZ 平面上（形状的 y = 世界的 -z），向上拉伸出厚度，边缘带倒角
  const floorGeometry = useMemo(() => {
    const b = Math.min(bevel, r.floorThickness / 2 - 1e-3)
    const x0 = -hw + b
    const x1 = hw - b
    const z0 = -hd + b
    const z1 = hd - b
    const c = r.chamfer
    const shape = new Shape()
    shape.moveTo(x0, -z0)
    shape.lineTo(x1, -z0)
    shape.lineTo(x1, -(z1 - c))
    shape.lineTo(x1 - c, -z1)
    shape.lineTo(x0, -z1)
    shape.closePath()
    return new ExtrudeGeometry(shape, {
      depth: r.floorThickness - 2 * b,
      bevelEnabled: true,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: sceneConfig.bevelSmoothness,
      curveSegments: 4,
    })
  }, [bevel, hw, hd, r.chamfer, r.floorThickness])

  return (
    <group>
      <mesh
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -r.floorThickness + Math.min(bevel, r.floorThickness / 2 - 1e-3), 0]}
        receiveShadow
      >
        <Matte color={palette.concrete} />
      </mesh>

      {/* 后墙（-Z），向左多出一个墙厚盖住转角 */}
      <BevelBox
        size={[r.width + r.wallThickness, wallFullHeight, r.wallThickness]}
        position={[-r.wallThickness / 2, wallCenterY, -hd - r.wallThickness / 2]}
        color={palette.wall}
      />
      {/* 左墙（-X） */}
      <BevelBox
        size={[r.wallThickness, wallFullHeight, r.depth]}
        position={[-hw - r.wallThickness / 2, wallCenterY, 0]}
        color={palette.wall}
      />

      {/* 墙顶压边 */}
      <BevelBox
        tier="small"
        size={[r.width + r.wallThickness + r.trimOverhang * 2, r.trimHeight, trimT]}
        position={[-r.wallThickness / 2, trimY, -hd - r.wallThickness / 2]}
        color={palette.slate}
      />
      <BevelBox
        tier="small"
        size={[trimT, r.trimHeight, r.depth + r.trimOverhang]}
        position={[-hw - r.wallThickness / 2, trimY, r.trimOverhang / 2]}
        color={palette.slate}
      />

      {/* 踢脚线 */}
      <BevelBox
        tier="rod"
        size={[r.width, r.baseboardHeight, r.baseboardThickness]}
        position={[0, r.baseboardHeight / 2, -hd + r.baseboardThickness / 2]}
        color={palette.baseboard}
      />
      <BevelBox
        tier="rod"
        size={[r.baseboardThickness, r.baseboardHeight, r.depth]}
        position={[-hw + r.baseboardThickness / 2, r.baseboardHeight / 2, 0]}
        color={palette.baseboard}
      />

      <Door />
    </group>
  )
}
