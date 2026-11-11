import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { CameraControls, CameraControlsImpl, OrthographicCamera } from '@react-three/drei'
import { Box3, MathUtils, Vector3, type OrthographicCamera as OrthoCam } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useSceneParams } from '../state/sceneParams'
import { onControlsEnabled, onResetView } from '../state/cameraActions'

const { ACTION } = CameraControlsImpl
const cam = sceneConfig.camera
const deg = MathUtils.degToRad

/** 俯角（与地面夹角）→ 极角（与竖直向上夹角） */
const polarFromDepression = (d: number) => deg(90 - d)

const defaultAzimuth = deg(cam.defaultAzimuthDeg)
const defaultPolar = polarFromDepression(cam.defaultDepressionDeg)
const [tx, ty, tz] = cam.target

// 默认相机位置：焦点 + 球坐标偏移
const defaultPosition = new Vector3().setFromSphericalCoords(cam.distance, defaultPolar, defaultAzimuth).add(new Vector3(tx, ty, tz))

const halfW = sceneConfig.room.width / 2
const halfD = sceneConfig.room.depth / 2

export function CameraRig() {
  // 显式把正交相机交给 CameraControls；控制器实例在相机就绪后才创建，所以用 state 跟踪
  const [ortho, setOrtho] = useState<OrthoCam | null>(null)
  const [controls, setControls] = useState<CameraControlsImpl | null>(null)
  const controlsRef = useRef<CameraControlsImpl | null>(null)
  useLayoutEffect(() => {
    controlsRef.current = controls
  }, [controls])
  const { width, height } = useThree((s) => s.size)
  const { camera: p } = useSceneParams()

  // 正交相机 zoom = 每米多少像素。按屏幕短边把"视野尺寸"换算成 zoom
  const minSide = Math.min(width, height)
  const fullZoom = minSide / p.fullViewSize
  const closeZoom = minSide / p.closeViewSize
  const fullZoomRef = useRef(fullZoom)

  // 操作映射与固定开关（每个控制器实例设置一次）
  useLayoutEffect(() => {
    const c = controls
    if (!c) return
    c.mouseButtons.left = ACTION.ROTATE
    c.mouseButtons.right = ACTION.TRUCK
    c.mouseButtons.middle = ACTION.NONE
    c.mouseButtons.wheel = ACTION.ZOOM
    c.touches.one = ACTION.TOUCH_ROTATE
    c.touches.two = ACTION.TOUCH_ZOOM_TRUCK
    c.touches.three = ACTION.NONE
    // 缩放以指针为中心；上下拖动平移时沿地面前后移动，焦点高度和俯角不变
    c.dollyToCursor = true
    c.verticalDragToForward = true
    c.setLookAt(defaultPosition.x, defaultPosition.y, defaultPosition.z, tx, ty, tz, false)
    fullZoomRef.current = 0
  }, [controls])

  // 可调参数：角度范围、阻尼、速度、缩放上下限
  useLayoutEffect(() => {
    const c = controls
    if (!c) return
    c.minAzimuthAngle = defaultAzimuth - deg(p.azimuthRangeDeg)
    c.maxAzimuthAngle = defaultAzimuth + deg(p.azimuthRangeDeg)
    c.minPolarAngle = polarFromDepression(p.maxDepressionDeg)
    c.maxPolarAngle = polarFromDepression(p.minDepressionDeg)
    c.smoothTime = p.smoothTime
    c.draggingSmoothTime = p.draggingSmoothTime
    c.azimuthRotateSpeed = p.rotateSpeed
    c.polarRotateSpeed = p.rotateSpeed
    c.truckSpeed = p.truckSpeed
    c.dollySpeed = p.dollySpeed
    c.minZoom = fullZoom
    c.maxZoom = closeZoom

    // 屏幕尺寸或全景视野变了：按比例保持用户当前的缩放程度（首次直接用全景）
    const prevFull = fullZoomRef.current
    const zoom = prevFull > 0 ? c.camera.zoom * (fullZoom / prevFull) : fullZoom
    fullZoomRef.current = fullZoom
    c.zoomTo(MathUtils.clamp(zoom, fullZoom, closeZoom), false)
  }, [controls, p, fullZoom, closeZoom])

  // 平移边界：按当前画面能看到的范围收放——焦点最多走到房间边缘贴住屏幕边缘的位置。
  // 全景时几乎为 0（居中），越放大越能走到角落；以指针为中心放大时不会被拉回房间中央
  const boundary = useMemo(() => new Box3(), [])
  const lastZoom = useRef(0)
  const minSideRef = useRef(minSide)
  useLayoutEffect(() => {
    minSideRef.current = minSide
    lastZoom.current = 0
  }, [minSide])
  useFrame(() => {
    const c = controlsRef.current
    if (!c) return
    const zoom = c.camera.zoom
    if (Math.abs(zoom - lastZoom.current) < 1e-4) return
    lastZoom.current = zoom
    const visibleHalf = (minSideRef.current / zoom / 2) * sceneConfig.controls.boundaryVisibleFactor
    const ax = Math.max(0, halfW - visibleHalf)
    const az = Math.max(0, halfD - visibleHalf)
    boundary.min.set(tx - ax, ty, tz - az)
    boundary.max.set(tx + ax, ty, tz + az)
    c.setBoundary(boundary)
  })

  // 回到全景：平滑过渡到默认角度、焦点和缩放
  useEffect(
    () =>
      onResetView(() => {
        const c = controlsRef.current
        if (!c) return
        c.setLookAt(defaultPosition.x, defaultPosition.y, defaultPosition.z, tx, ty, tz, true)
        c.zoomTo(fullZoomRef.current, true)
      }),
    [],
  )

  // 编辑器拖动物件时暂停相机
  useEffect(
    () =>
      onControlsEnabled((enabled) => {
        if (controlsRef.current) controlsRef.current.enabled = enabled
      }),
    [],
  )

  return (
    <>
      <OrthographicCamera
        ref={setOrtho}
        makeDefault
        position={defaultPosition.toArray()}
        near={cam.near}
        far={cam.far}
      />
      {ortho && <CameraControls ref={setControls} camera={ortho} makeDefault />}
    </>
  )
}
