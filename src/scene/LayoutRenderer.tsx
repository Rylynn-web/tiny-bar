import { MathUtils } from 'three'
import { useLayoutItems } from '../state/layoutStore'
import { useEditorBridge } from '../state/editorBridge'
import { useSceneParams } from '../state/sceneParams'
import { MergeStatic } from './primitives/MergeStatic'
import { catalog } from './catalog'
import { SideWallItem } from './room/SideWallItem'
import { wallOf } from './room/walls'

/** 按 layout.json（或编辑器里的当前布局）渲染每个物件 */
export function LayoutRenderer() {
  const items = useLayoutItems()
  const bridge = useEditorBridge()
  const params = useSceneParams()

  return (
    <>
      {items.map((item) => {
        const entry = catalog[item.type]
        if (!entry) return null
        const Component = entry.component
        const wall = entry.mount === 'wall' ? wallOf(item) : null
        const inner = (
          <group
            position={item.position}
            rotation={[0, MathUtils.degToRad(item.rotationY), 0]}
            scale={item.scale ?? 1}
          >
            {/* 参数或 props 变了才重新合并；拖动只改外层位置，不触发 */}
            <MergeStatic
              enabled={params.mergeStatic && entry.merge !== false}
              version={params}
              extra={JSON.stringify(item.props ?? null)}
            >
              <Component props={{ ...entry.defaultProps, ...item.props }} item={item} />
            </MergeStatic>
          </group>
        )
        // 左右墙上的物件跟着墙一起隐藏
        const node = wall === 'left' || wall === 'right' ? <SideWallItem side={wall}>{inner}</SideWallItem> : inner
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
