import { useMemo, useRef, type ReactNode } from 'react'
import { Outlines } from '@react-three/drei'
import {
  CatmullRomCurve3,
  LatheGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Quaternion,
  Vector2,
  Vector3,
  type Group,
  type Material,
  type Mesh,
} from 'three'
import { buddyShape as S, sceneConfig } from '../../config/sceneConfig'
import { getSeat } from '../../config/seatConfig'
import { useSceneParams } from '../../state/sceneParams'
import { useBlink } from './useBlink'
import { useBreath } from './useBreath'

const B = sceneConfig.buddy
const BODY_BOTTOM = S.bodyProfile[0][1]

/** 身体：轮廓点平滑成曲线后绕 Y 轴旋转 */
function useBodyGeometry() {
  return useMemo(() => {
    const curve = new CatmullRomCurve3(
      S.bodyProfile.map(([r, y]) => new Vector3(r, y, 0)),
      false,
      'centripetal',
    )
    const pts = curve.getPoints(48).map((p) => new Vector2(Math.max(0, p.x), p.y))
    const g = new LatheGeometry(pts, 48)
    g.computeVertexNormals()
    return g
  }, [])
}

/** 眼睛在头表面的位置与朝向（side: -1 左，1 右） */
function eyeTransform(side: -1 | 1) {
  const { radius, squashY } = S.head
  const dir = new Vector3(
    side * Math.sin(S.eye.yaw) * Math.cos(S.eye.pitch),
    Math.sin(S.eye.pitch),
    Math.cos(S.eye.yaw) * Math.cos(S.eye.pitch),
  )
  const r = radius - S.eye.inset
  const position = new Vector3(dir.x * r, dir.y * r * squashY, dir.z * r)
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir)
  return { position, quaternion }
}

type PartProps = { material: Material; outline: boolean; children?: ReactNode } & Record<string, unknown>

/** 带可选描边的一块身体 */
function Part({ material, outline, children, ...rest }: PartProps) {
  return (
    <mesh material={material} castShadow receiveShadow {...rest}>
      {children}
      {outline && (
        <Outlines thickness={B.outlineThickness} color={B.outlineColor} />
      )}
    </mesh>
  )
}

export function BarBuddy() {
  const { buddy } = useSceneParams()
  const sitting = buddy.pose === 'sit'
  const outline = buddy.outline

  const bodyMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        roughness: B.roughness,
        metalness: 0,
        sheen: B.sheen,
        sheenRoughness: B.sheenRoughness,
        sheenColor: '#ffffff',
        envMapIntensity: sceneConfig.material.envMapIntensity,
      }),
    [],
  )
  bodyMat.color.set(buddy.bodyColor)

  const eyeMat = useMemo(() => new MeshStandardMaterial({ roughness: 0.6, metalness: 0 }), [])
  eyeMat.color.set(buddy.eyeColor)

  const bodyGeometry = useBodyGeometry()
  const eyes = useMemo(() => [eyeTransform(-1), eyeTransform(1)], [])

  const torso = useRef<Group>(null)
  const head = useRef<Group>(null)
  const eyeL = useRef<Mesh>(null)
  const eyeR = useRef<Mesh>(null)
  useBlink([eyeL, eyeR])
  useBreath(torso, head, S.head.centerY, S.neck.top - BODY_BOTTOM)

  // 姿势
  const legPitch = sitting ? S.sit.legPitch : 0
  const armPitch = sitting ? S.sit.armPitch : 0
  const armSplay = sitting ? S.sit.armSplay : S.arm.splay

  // 摆放：坐在椅子上，或站在指定位置
  const scale = B.height / S.designHeight
  const seat = getSeat(B.seatId)
  const placement = useMemo(() => {
    if (!sitting) {
      return { position: B.standPosition, rotationY: B.standRotationY }
    }
    const back = new Vector3(0, 0, -B.sitBack).applyAxisAngle(new Vector3(0, 1, 0), seat.rotationY)
    return {
      position: [
        seat.position[0] + back.x,
        seat.position[1] - B.sitSink * scale,
        seat.position[2] + back.z,
      ] as [number, number, number],
      rotationY: seat.rotationY,
    }
  }, [sitting, seat, scale])

  return (
    <group position={placement.position} rotation={[0, placement.rotationY, 0]} scale={scale}>
      {/* 腿：以髋部为支点，站立时向下，坐下时向前 */}
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[side * S.leg.offsetX, S.leg.hipY - (sitting ? S.sit.hipDrop : 0), sitting ? S.sit.hipForward : 0]}
          rotation={[legPitch, 0, 0]}
        >
          <Part material={bodyMat} outline={outline} position={[0, -S.leg.length / 2, 0]}>
            <capsuleGeometry args={[S.leg.radius, S.leg.length, 8, 16]} />
          </Part>
        </group>
      ))}

      {/* 躯干：以身体底部为呼吸支点 */}
      <group ref={torso} position={[0, BODY_BOTTOM, 0]}>
        <group position={[0, -BODY_BOTTOM, 0]}>
          <Part material={bodyMat} outline={outline} geometry={bodyGeometry} />
          <Part material={bodyMat} outline={outline} position={[0, (S.neck.bottom + S.neck.top) / 2, 0]}>
            <cylinderGeometry args={[S.neck.radius, S.neck.radius, S.neck.top - S.neck.bottom, 32]} />
          </Part>
          {([-1, 1] as const).map((side) => (
            <group
              key={side}
              position={[side * S.arm.shoulderX, S.arm.shoulderY, 0]}
              rotation={[armPitch, 0, side * armSplay]}
            >
              <Part material={bodyMat} outline={outline} position={[0, -S.arm.length / 2, 0]}>
                <capsuleGeometry args={[S.arm.radius, S.arm.length, 8, 16]} />
              </Part>
            </group>
          ))}
        </group>
      </group>

      {/* 头 + 眼睛 */}
      <group ref={head} position={[0, S.head.centerY, 0]}>
        <Part material={bodyMat} outline={outline} scale={[1, S.head.squashY, 1]}>
          <sphereGeometry args={[S.head.radius, 48, 32]} />
        </Part>
        {eyes.map((e, i) => (
          <group key={i} position={e.position} quaternion={e.quaternion} scale={S.eye.size}>
            {/* 眨眼只缩放这一层的 Y */}
            <mesh ref={i === 0 ? eyeL : eyeR} material={eyeMat}>
              <sphereGeometry args={[1, 20, 14]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
