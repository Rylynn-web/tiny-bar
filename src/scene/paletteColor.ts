import type { SceneParams } from '../state/sceneParams'

type Palette = SceneParams['palette']

/** 把 layout props 里的调色板键名换成颜色；键名无效时用 fallback */
export function paletteColor(palette: Palette, key: unknown, fallback: keyof Palette) {
  return typeof key === 'string' && key in palette ? palette[key as keyof Palette] : palette[fallback]
}
