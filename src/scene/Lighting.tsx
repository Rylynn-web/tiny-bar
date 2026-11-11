import { sceneConfig } from '../config/sceneConfig'
import { useLighting } from '../state/sceneParams'

/** 背景 + 环境光（天空/地面两色）+ 投影主光。吊灯的光在 PendantLamp 里 */
export function Lighting() {
  const l = useLighting()
  const s = sceneConfig.shadows
  const e = s.cameraExtent
  return (
    <>
      <color attach="background" args={[l.background]} />
      <hemisphereLight args={[l.ambientSky, l.ambientGround, l.ambientIntensity]} />
      <directionalLight
        position={sceneConfig.lighting.sunPosition}
        color={l.sunColor}
        intensity={l.sunIntensity}
        castShadow
        shadow-mapSize={[s.mapSize, s.mapSize]}
        shadow-radius={s.radius}
        shadow-bias={s.bias}
        shadow-normalBias={s.normalBias}
        shadow-camera-left={-e}
        shadow-camera-right={e}
        shadow-camera-top={e}
        shadow-camera-bottom={-e}
        shadow-camera-near={0.1}
        shadow-camera-far={20}
      />
    </>
  )
}
