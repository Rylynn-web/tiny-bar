import { Environment, Lightformer } from '@react-three/drei'
import type { DirectionalLight } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useLighting } from '../state/sceneParams'

/** 主光的阴影相机额外渲染"只投影"层（隐形投影墙） */
function enableShadowOnlyLayer(light: DirectionalLight | null) {
  light?.shadow.camera.layers.enable(sceneConfig.shadows.shadowOnlyLayer)
}

/** 背景 + 环境光（天空/地面两色）+ 唯一一盏投影主光 + 程序化环境反射 */
export function Lighting() {
  const l = useLighting()
  const s = sceneConfig.shadows
  const e = s.cameraExtent
  const env = sceneConfig.environment
  return (
    <>
      <color attach="background" args={[l.background]} />
      <hemisphereLight args={[l.ambientSky, l.ambientGround, l.ambientIntensity]} />
      <directionalLight
        ref={enableShadowOnlyLayer}
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
      {/* 只渲染一次的柔光板环境，给金属反射用；不下载 HDR */}
      <Environment frames={1} resolution={env.resolution}>
        <color attach="background" args={[env.baseColor]} />
        {env.lightformers.map((f, i) => (
          <Lightformer
            key={i}
            form="rect"
            position={f.position}
            rotation-x={f.rotationX}
            scale={[f.scale[0], f.scale[1], 1]}
            intensity={f.intensity}
            target={[0, 0, 0]}
          />
        ))}
      </Environment>
    </>
  )
}
