import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'

/** 木条地板 + 两面墙相交的一角。地板顶面在 y=0，墙在 -X、-Z 两侧 */
export function RoomCorner() {
  const { palette } = useSceneParams()
  const { size, floorThickness, wallHeight, wallThickness, plankCount, plankGap } = sceneConfig.room
  const half = size / 2
  const plankWidth = size / plankCount
  const wallFullHeight = wallHeight + floorThickness
  const wallCenterY = wallHeight - wallFullHeight / 2

  return (
    <group>
      {/* 木条沿 X 方向，沿 Z 方向排开 */}
      {Array.from({ length: plankCount }, (_, i) => (
        <BevelBox
          key={i}
          size={[size, floorThickness, plankWidth - plankGap]}
          position={[0, -floorThickness / 2, -half + plankWidth * (i + 0.5)]}
          color={palette.wood}
        />
      ))}

      {/* 后墙（-Z），向左多出一个墙厚，盖住转角 */}
      <BevelBox
        size={[size + wallThickness, wallFullHeight, wallThickness]}
        position={[-wallThickness / 2, wallCenterY, -half - wallThickness / 2]}
        color={palette.wall}
      />
      {/* 左墙（-X） */}
      <BevelBox
        size={[wallThickness, wallFullHeight, size]}
        position={[-half - wallThickness / 2, wallCenterY, 0]}
        color={palette.wall}
      />
    </group>
  )
}
