import { useMemo } from 'react'
import { LatheGeometry, Vector2, type BufferGeometry } from 'three'
import { sceneConfig } from '../../config/sceneConfig'

// 同样的轮廓只生成一次（瓶子、杯子等会被很多地方复用）
const cache = new Map<string, BufferGeometry>()

/** 旋转体：profile 为 [半径, 高度] 点列，自下而上；原点在底面中心 */
export function getLathe(
  profile: readonly (readonly [number, number])[],
  segments: number = sceneConfig.detail.latheSegments,
) {
  const key = `${segments}|${profile.map((p) => p.join(',')).join(';')}`
  let g = cache.get(key)
  if (!g) {
    g = new LatheGeometry(
      profile.map(([r, y]) => new Vector2(r, y)),
      segments,
    )
    g.computeVertexNormals()
    cache.set(key, g)
  }
  return g
}

export function useLathe(
  profile: readonly (readonly [number, number])[],
  segments: number = sceneConfig.detail.latheSegments,
) {
  return useMemo(() => getLathe(profile, segments), [profile, segments])
}
