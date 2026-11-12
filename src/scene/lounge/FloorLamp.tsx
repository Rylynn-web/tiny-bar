import { useMemo } from 'react'
import { CatmullRomCurve3, DoubleSide, TubeGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { Metal } from '../primitives/Metal'
import { LightPool } from '../primitives/LightPool'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { useLathe } from '../primitives/useLathe'
import type { CatalogProps } from '../catalogTypes'
import { LightCone } from '../primitives/LightCone'

const F = sceneConfig.lounge.floorLamp

/** 落地弧灯：圆底座 + 不锈钢弧管（向 +X 弯出）+ 灯罩 + 自发光灯泡 + 灯下光斑。原点在底座中心。props.poolHeight 覆盖光斑高度 */
export function FloorLamp({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const tube = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3(F.arc.map((p) => new Vector3(...p))), 64, F.tubeRadius, 8, false),
    [],
  )
  const shadeGeo = useLathe(F.shade, 40)
  const shadeHeight = Math.max(...F.shade.map((p) => p[1]))
  const [ex, ey, ez] = F.arc[F.arc.length - 1]
  const shadeBottom = ey - shadeHeight
  const poolHeight = typeof props.poolHeight === 'number' ? props.poolHeight : F.poolHeight
  // 单件灯的亮度倍数（编辑器里的「亮度」滑杆）
  const brightness = typeof props.brightness === 'number' ? props.brightness : 1

  return (
    <group>
      <RoundedCylinder radius={F.baseRadius} height={F.baseHeight} color={palette.steel} surface={<Metal />} tier="small" />
      <mesh geometry={tube} castShadow>
        <Metal />
      </mesh>
      {/* 开口薄壳：双面渲染 + 双面投影 */}
      <mesh geometry={shadeGeo} position={[ex, shadeBottom, ez]} castShadow>
        <Metal side={DoubleSide} shadowSide={DoubleSide} />
      </mesh>
      <mesh position={[ex, shadeBottom, ez]}>
        <sphereGeometry args={[F.bulbRadius, 16, 12]} />
        <Glow color={palette.warmLight} group="floorLamp" multiplier={brightness} />
      </mesh>
      {/* 灯罩开口往下的光锥，落到沙发区的光斑 */}
      <LightCone
        position={[ex, shadeBottom, ez]}
        radiusTop={F.shade[0][0] * 0.95}
        radiusBottom={F.poolRadius * sceneConfig.lightCone.bottomRatio}
        height={shadeBottom - poolHeight}
        group="coneFloorLamp"
        multiplier={brightness}
      />
      <LightPool position={[ex, poolHeight, ez]} radius={F.poolRadius} group="poolFloorLamp" multiplier={brightness} />
    </group>
  )
}
