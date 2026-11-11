import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import type { LayoutItem } from '../config/layoutTypes'

/**
 * 编辑器和场景之间的接口。生产环境里它永远是 null，
 * 场景只在拿到它时才挂上编辑相关的东西，编辑器代码本身不会进入生产包。
 */
export type EditorBridge = {
  /** 包住 Canvas 内的整个场景（用于选中描边） */
  Root: ComponentType<{ children: ReactNode }>
  /** 包住每个布局物件（选中、拖动） */
  ItemWrapper: ComponentType<{ item: LayoutItem; children: ReactNode }>
  /** 场景里额外的编辑辅助（座位锚点、重叠提示、精确调整手柄） */
  SceneExtras: ComponentType
  /** 追加到后处理链里的效果（描边） */
  extraEffects: ReactNode
  /** 点到空白处 */
  onPointerMissed: () => void
}

export const EditorBridgeContext = createContext<EditorBridge | null>(null)

export function useEditorBridge() {
  return useContext(EditorBridgeContext)
}
