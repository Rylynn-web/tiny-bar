import { useLayoutEffect, useRef, type ComponentRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls, OrthographicCamera } from '@react-three/drei'
import { TOUCH } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useSceneParams } from '../state/sceneParams'

const cam = sceneConfig.camera
const ctl = sceneConfig.controls

// 由极角/方位角/距离算出相机位置
const initialPosition: [number, number, number] = [
  cam.target[0] + cam.distance * Math.sin(cam.polarAngle) * Math.sin(cam.azimuthAngle),
  cam.target[1] + cam.distance * Math.cos(cam.polarAngle),
  cam.target[2] + cam.distance * Math.sin(cam.polarAngle) * Math.cos(cam.azimuthAngle),
]

export function CameraRig() {
  const cameraRef = useRef<ComponentRef<typeof OrthographicCamera>>(null)
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const baseZoomRef = useRef<number | null>(null)
  const { width, height } = useThree((s) => s.size)
  const { viewSize } = useSceneParams()

  // 正交相机的 zoom = 每个世界单位占多少像素。
  // 按屏幕短边算出"刚好装下 viewSize"的基准 zoom，窗口变化时保留用户缩放的比例。
  useLayoutEffect(() => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return

    const base = Math.min(width, height) / viewSize
    const prevBase = baseZoomRef.current
    const ratio = prevBase ? camera.zoom / prevBase : 1
    baseZoomRef.current = base

    controls.minZoom = base * ctl.minZoomFactor
    controls.maxZoom = base * ctl.maxZoomFactor
    camera.zoom = Math.min(controls.maxZoom, Math.max(controls.minZoom, base * ratio))
    camera.updateProjectionMatrix()
  }, [width, height, viewSize])

  return (
    <>
      <OrthographicCamera
        ref={cameraRef}
        makeDefault
        position={initialPosition}
        near={cam.near}
        far={cam.far}
      />
      <OrbitControls
        ref={controlsRef}
        target={cam.target}
        enablePan={ctl.enablePan}
        enableDamping={ctl.enableDamping}
        dampingFactor={ctl.dampingFactor}
        rotateSpeed={ctl.rotateSpeed}
        zoomSpeed={ctl.zoomSpeed}
        minPolarAngle={ctl.minPolarAngle}
        maxPolarAngle={ctl.maxPolarAngle}
        minAzimuthAngle={cam.azimuthAngle - ctl.azimuthRange}
        maxAzimuthAngle={cam.azimuthAngle + ctl.azimuthRange}
        // 单指旋转，双指捏合缩放（平移已禁用）
        touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN }}
      />
    </>
  )
}
