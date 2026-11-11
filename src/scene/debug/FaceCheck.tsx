import { useEffect, useMemo } from 'react'
import { MathUtils } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSeats, type Seat } from '../../config/seatConfig'
import { useSceneParams, type CameraParams } from '../../state/sceneParams'

// 脸部可见性检查（只在 ?debug 下按需加载）：
// 对每个座位，在允许的相机角度范围内找一个角度，让"小人指向相机的方向"与小人朝向的夹角最小；
// 小于 maxAngleDeg 就算看得到正脸（绿），否则红，并在控制台列出红色座位。

const F = sceneConfig.faceCheck
const deg = MathUtils.degToRad

/** 在允许的方位角 × 俯角范围内取样，返回能达到的最小夹角（度） */
function bestAngle(seat: Seat, cam: CameraParams) {
  const azMin = Math.min(cam.azimuthMinDeg, sceneConfig.camera.defaultAzimuthDeg)
  const azMax = Math.max(cam.azimuthMaxDeg, sceneConfig.camera.defaultAzimuthDeg)
  const yaw = seat.rotationY
  let best = 180
  for (let az = azMin; az <= azMax + 1e-6; az += F.sampleStepDeg) {
    for (let dep = cam.minDepressionDeg; dep <= cam.maxDepressionDeg + 1e-6; dep += F.sampleStepDeg) {
      // 相机方向（从小人指向相机）与朝向（水平，yaw = 0 面朝 +Z）的点积 = cos俯角 × cos(方位角差)
      const dot = Math.cos(deg(dep)) * Math.cos(deg(az) - yaw)
      best = Math.min(best, MathUtils.radToDeg(Math.acos(MathUtils.clamp(dot, -1, 1))))
    }
  }
  return best
}

export default function FaceCheck() {
  const seats = useSeats()
  const { camera } = useSceneParams()

  const results = useMemo(
    () =>
      seats
        .filter((s) => !(F.excludeTypes as readonly string[]).includes(s.type))
        .map((s) => {
          const angle = bestAngle(s, camera)
          return { seat: s, angle, ok: angle < F.maxAngleDeg }
        }),
    [seats, camera],
  )

  const failKey = results.filter((r) => !r.ok).map((r) => r.seat.id).join(',')
  useEffect(() => {
    const fails = results.filter((r) => !r.ok)
    if (fails.length)
      console.warn(
        `[脸部检查] ${fails.length} 个座位在允许的相机角度内看不到正脸：`,
        fails.map((r) => `${r.seat.id}（最小夹角 ${r.angle.toFixed(1)}°）`),
      )
    else console.info(`[脸部检查] 全部 ${results.length} 个座位都能看到正脸`)
    // 只在红色座位的集合变化时打印
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failKey, results.length])

  return (
    <group userData={{ editorIgnore: true }}>
      {results.map(({ seat, ok }) => (
        <mesh
          key={seat.id}
          position={[seat.position[0], seat.position[1] + F.markerLift, seat.position[2]]}
          renderOrder={20}
          raycast={() => null}
        >
          <sphereGeometry args={[F.markerRadius, 12, 8]} />
          <meshBasicMaterial color={ok ? F.okColor : F.failColor} depthTest={false} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}
