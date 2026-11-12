import { useMemo } from 'react'
import { sceneConfig } from '../../config/sceneConfig'
import type { LayoutProps } from '../../config/layoutTypes'
import { resolveQuality } from '../../state/quality'
import { useSceneParams } from '../../state/sceneParams'
import { getArtTexture, type ArtKind } from './artTextures'

/** 读一个数字 props（缺省时用 fallback） */
export function num(props: LayoutProps, key: string, fallback: number) {
  const v = props[key]
  return typeof v === 'number' ? v : fallback
}

/**
 * 取一幅画的贴图：seed 决定构图、paletteSeed 决定配色；长边按画质档取 1024 / 512。
 * 同样的参数只生成一次。
 */
export function useArtTexture(kind: ArtKind, props: LayoutProps, aspect: number, longSide?: number) {
  const { palette, quality } = useSceneParams()
  const size = longSide ?? sceneConfig.decor.textureSize[resolveQuality(quality)]
  const seed = num(props, 'seed', 1)
  const paletteSeed = num(props, 'paletteSeed', 0)
  return useMemo(() => getArtTexture(kind, seed, paletteSeed, palette, aspect, size), [kind, seed, paletteSeed, palette, aspect, size])
}
