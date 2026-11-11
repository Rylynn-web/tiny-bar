import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Door } from './Door'

/** 水泥地面 + 后墙/左墙 + 墙顶压边 + 踢脚线 + 门 */
export function Room() {
  const { palette } = useSceneParams()
  const r = sceneConfig.room
  const hw = r.width / 2
  const hd = r.depth / 2
  const wallFullHeight = r.wallHeight + r.floorThickness
  const wallCenterY = r.wallHeight - wallFullHeight / 2
  const trimY = r.wallHeight + r.trimHeight / 2
  const trimT = r.wallThickness + r.trimOverhang * 2

  return (
    <group>
      <BevelBox
        size={[r.width, r.floorThickness, r.depth]}
        position={[0, -r.floorThickness / 2, 0]}
        color={palette.concrete}
        castShadow={false}
      />

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
