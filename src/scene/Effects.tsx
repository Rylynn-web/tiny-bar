import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { sceneConfig } from '../config/sceneConfig'
import { useSceneParams } from '../state/sceneParams'

/** 后处理：环境光遮蔽 + Neutral 色调映射（尽量保留调色板原色） */
export function Effects() {
  const { ao } = useSceneParams()
  const cfg = sceneConfig.ao
  return (
    <EffectComposer multisampling={sceneConfig.postprocessing.multisampling}>
      <N8AO
        intensity={ao.intensity}
        aoRadius={ao.radius}
        distanceFalloff={cfg.distanceFalloff}
        quality={cfg.quality}
        halfRes={cfg.halfRes}
      />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
    </EffectComposer>
  )
}
