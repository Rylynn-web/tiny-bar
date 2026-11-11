import { Bloom, EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { HalfFloatType } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useSceneParams } from '../state/sceneParams'
import { useEditorBridge } from '../state/editorBridge'

/** 后处理：环境光遮蔽 → Bloom（只让自发光 > 1 的表面发光）→ Neutral 色调映射 */
export function Effects() {
  const { ao, bloom } = useSceneParams()
  const cfg = sceneConfig.ao
  const b = sceneConfig.bloom
  const bridge = useEditorBridge()
  return (
    <EffectComposer
      multisampling={sceneConfig.postprocessing.multisampling}
      frameBufferType={HalfFloatType}
      // 编辑器的选中描边（Outline）要求关掉 autoClear；正常模式保持默认
      autoClear={bridge ? false : undefined}
    >
      <N8AO
        intensity={ao.intensity}
        aoRadius={ao.radius}
        distanceFalloff={cfg.distanceFalloff}
        quality={cfg.quality}
        halfRes={cfg.halfRes}
      />
      <Bloom
        mipmapBlur
        intensity={bloom.intensity}
        luminanceThreshold={b.luminanceThreshold}
        luminanceSmoothing={b.luminanceSmoothing}
        radius={b.radius}
      />
      <>{bridge?.extraEffects}</>
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}
