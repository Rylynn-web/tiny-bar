import { useEffect, useMemo } from 'react'
import { AdditiveBlending, Color, CylinderGeometry, DoubleSide, ShaderMaterial } from 'three'
import type { ThreeElements } from '@react-three/fiber'
import { sceneConfig } from '../../config/sceneConfig'
import { useLighting, useSceneParams } from '../../state/sceneParams'

const C = sceneConfig.lightCone

/** 光锥材质：顶部最亮、往下按 falloff 变淡；正对视线的中间亮、侧边柔和（叠加混合，不写深度） */
function createConeMaterial() {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color() },
      uStrength: { value: 0 },
      uFalloff: { value: C.falloff },
      uEdge: { value: C.edgeSoftness },
    },
    vertexShader: /* glsl */ `
      varying float vY;
      varying vec3 vNormal;
      void main() {
        vY = uv.y;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength, uFalloff, uEdge;
      varying float vY;
      varying vec3 vNormal;
      void main() {
        // 正交相机：视线在相机坐标里总是 -Z；法线越正对视线越亮，侧边淡出。
        // pow / normalize 的输入都要夹在安全范围里：插值出的负数或零向量会算出 NaN，经过后处理整屏变黑
        float len = length(vNormal);
        float facing = len > 1e-5 ? pow(clamp(abs(vNormal.z) / len, 0.0, 1.0), uEdge) : 0.0;
        float fade = pow(clamp(vY, 1e-4, 1.0), uFalloff);
        gl_FragColor = vec4(uColor * uStrength * fade * facing, 1.0);
      }
    `,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
  })
}

type Props = Omit<ThreeElements['group'], 'children'> & {
  /** 顶部（灯罩开口）半径、底部半径、高度（向下） */
  radiusTop: number
  radiusBottom: number
  height: number
  /** 浓度分组（sceneConfig.emissive 里的键） */
  group: keyof typeof sceneConfig.emissive
  /** 单件灯的亮度倍数 */
  multiplier?: number
}

/**
 * 灯下的光锥（假体积光）：顶点在原点（灯罩下沿），向下展开 height。
 * 强度 = 分组浓度 × 当前时段的 glow 倍率 × 单件倍数：夜晚明显，白天几乎看不到。不参与点击和编辑器尺寸。
 */
export function LightCone({ radiusTop, radiusBottom, height, group, multiplier = 1, ...rest }: Props) {
  const { palette, emissive } = useSceneParams()
  const { glow } = useLighting()
  const geometry = useMemo(
    () => new CylinderGeometry(radiusTop, radiusBottom, height, C.segments, 1, true).translate(0, -height / 2, 0),
    [radiusTop, radiusBottom, height],
  )
  const material = useMemo(() => createConeMaterial(), [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  material.uniforms.uColor.value.set(palette[C.color])
  material.uniforms.uStrength.value = emissive[group] * glow * multiplier

  return (
    <group {...rest}>
      <mesh
        geometry={geometry}
        material={material}
        renderOrder={6}
        raycast={() => null}
        userData={{ editorIgnore: true }}
        visible={material.uniforms.uStrength.value > 0.005}
      />
    </group>
  )
}
