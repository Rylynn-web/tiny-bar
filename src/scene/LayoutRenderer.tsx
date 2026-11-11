import { MathUtils } from 'three'
import { useLayoutItems } from '../state/layoutStore'
import { useEditorBridge } from '../state/editorBridge'
import { catalog } from './catalog'

/** 按 layout.json（或编辑器里的当前布局）渲染每个物件 */
export function LayoutRenderer() {
  const items = useLayoutItems()
  const bridge = useEditorBridge()

  return (
    <>
      {items.map((item) => {
        const entry = catalog[item.type]
        if (!entry) return null
        const Component = entry.component
        const node = (
          <group
            position={item.position}
            rotation={[0, MathUtils.degToRad(item.rotationY), 0]}
            scale={item.scale ?? 1}
          >
            <Component props={{ ...entry.defaultProps, ...item.props }} />
          </group>
        )
        return bridge ? (
          <bridge.ItemWrapper key={item.id} item={item}>
            {node}
          </bridge.ItemWrapper>
        ) : (
          <group key={item.id}>{node}</group>
        )
      })}
    </>
  )
}
