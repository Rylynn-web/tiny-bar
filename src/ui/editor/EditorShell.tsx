import { useEffect, useMemo } from 'react'
import { Outline, Selection } from '@react-three/postprocessing'
import { editorConfig } from '../../config/editorConfig'
import { EditorBridgeContext, type EditorBridge } from '../../state/editorBridge'
import { Scene } from '../../scene/Scene'
import { EditorItem } from '../../scene/editor/EditorItem'
import { EditorExtras } from '../../scene/editor/EditorExtras'
import { deleteSelected, duplicateSelected, rotateSelected, select, undo } from '../../scene/editor/editorStore'
import { EditorPanel } from './EditorPanel'
import './editor.css'

const E = editorConfig

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
}

/** 快捷键：Cmd/Ctrl+Z 撤销、Cmd/Ctrl+D 复制、Delete 删除、R 旋转（Shift+R 反向）、Esc 取消选中 */
function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        undo()
      } else if (mod && key === 'd') {
        e.preventDefault()
        duplicateSelected()
      } else if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        deleteSelected()
      } else if (!mod && key === 'r') {
        rotateSelected(e.shiftKey ? -1 : 1)
      } else if (key === 'escape') {
        select(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

/** 开发环境 ?edit：带编辑器的场景 + 侧边栏 */
export default function EditorShell() {
  useShortcuts()
  const bridge = useMemo<EditorBridge>(
    () => ({
      Root: Selection,
      ItemWrapper: EditorItem,
      SceneExtras: EditorExtras,
      extraEffects: (
        <Outline
          visibleEdgeColor={E.outlineColor}
          hiddenEdgeColor={E.outlineHiddenColor}
          edgeStrength={E.outlineStrength}
          blur
        />
      ),
      onPointerMissed: () => select(null),
    }),
    [],
  )

  return (
    <EditorBridgeContext.Provider value={bridge}>
      <Scene />
      <EditorPanel />
    </EditorBridgeContext.Provider>
  )
}
