import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import { stepWalls } from '../../state/wallVisibility'

/** 每帧读摄像机的水平方位角，推进左右墙的升降（墙本身在 Room 里按结果改高度） */
export function WallVisibilityDriver() {
  const dir = useMemo(() => new Vector3(), [])
  // 优先级比默认的 0 小：在墙和墙面物件的 useFrame 之前更新
  useFrame(({ camera }, delta) => {
    camera.getWorldDirection(dir)
    // 摄像机相对焦点的偏移 = 视线反方向；方位角从 +Z 起、朝 +X 为正
    const azimuth = MathUtils.radToDeg(Math.atan2(-dir.x, -dir.z))
    stepWalls(azimuth, Math.min(delta, 0.1))
  }, -1)
  return null
}
