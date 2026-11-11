import { MathUtils } from 'three'
import type { LayoutProps } from '../../config/layoutTypes'
import { sceneConfig } from '../../config/sceneConfig'

/** 窗户宽度：props.width，限制在允许范围内（Room 开洞和窗户组件共用） */
export function windowWidth(props: LayoutProps | undefined) {
  const W = sceneConfig.cityWindow
  const w = typeof props?.width === 'number' ? props.width : W.defaultWidth
  return MathUtils.clamp(w, W.minWidth, W.maxWidth)
}
