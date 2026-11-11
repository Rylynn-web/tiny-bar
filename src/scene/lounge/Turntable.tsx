import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { BevelBox } from '../primitives/BevelBox'
import { Glass } from '../primitives/Glass'
import { Metal } from '../primitives/Metal'
import { RoundedCylinder } from '../primitives/RoundedCylinder'

const T = sceneConfig.lounge.turntable

/** 唱机：木底座 + 深色唱盘 + 橙色标签 + 不锈钢唱臂 + 打开的亚克力防尘盖。原点在底面中心 */
export function Turntable() {
  const { palette } = useSceneParams()
  const [bw, bh, bd] = T.baseSize
  const [px, pz] = T.platterOffset
  const [ax, az] = T.armPivot
  return (
    <group>
      <BevelBox tier="small" size={T.baseSize} position={[0, bh / 2, 0]} color={palette.wood} />
      <RoundedCylinder radius={T.platterRadius} height={T.platterHeight} position={[px, bh, pz]} color={palette.dark} tier="rod" />
      <RoundedCylinder
        radius={T.labelRadius}
        height={T.platterHeight / 2}
        position={[px, bh + T.platterHeight, pz]}
        color={palette.orange}
        tier="rod"
        castShadow={false}
      />
      <group position={[ax, bh, az]} rotation={[0, T.armYaw, 0]}>
        <RoundedCylinder radius={T.armRadius * 3} height={T.armRadius * 6} color={palette.steel} surface={<Metal />} tier="rod" />
        <mesh position={[-T.armLength / 2, T.armRadius * 5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <capsuleGeometry args={[T.armRadius, T.armLength, 4, 8]} />
          <Metal />
        </mesh>
      </group>
      {/* 防尘盖：铰链在后沿，向后打开 */}
      <group position={[0, bh, -bd / 2]} rotation={[-T.lidOpen, 0, 0]}>
        <mesh position={[0, T.lidSize[1] / 2, T.lidSize[2] / 2]}>
          <boxGeometry args={[bw, T.lidSize[1], T.lidSize[2]]} />
          <Glass color={palette.steel} />
        </mesh>
      </group>
    </group>
  )
}
