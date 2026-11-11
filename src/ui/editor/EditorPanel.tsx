import { editorConfig } from '../../config/editorConfig'
import { useLayoutItems } from '../../state/layoutStore'
import { catalog } from '../../scene/catalog'
import {
  addItem,
  deleteSelected,
  discardBackup,
  duplicateSelected,
  restoreBackup,
  rotateSelected,
  save,
  select,
  togglePivot,
  beginTransient,
  endTransient,
  undo,
  updateProp,
  updateRoom,
  useEditor,
} from '../../scene/editor/editorStore'
import { useRoom } from '../../state/layoutStore'

/** 滑杆：按下时开始一次"拖动"，松手算一步撤销 */
function Slider(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="editor-panel__label">
      {props.label}：{props.value.toFixed(2)}
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onPointerDown={beginTransient}
        onPointerUp={endTransient}
        onKeyDown={beginTransient}
        onKeyUp={endTransient}
        onBlur={endTransient}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  )
}

const fmt = (n: number) => n.toFixed(2)

/** 编辑器侧边栏：物件列表、添加物件、选中物件信息与操作、保存 */
export function EditorPanel() {
  const items = useLayoutItems()
  const selectedId = useEditor((s) => s.selectedId)
  const pivotMode = useEditor((s) => s.pivotMode)
  const dirty = useEditor((s) => s.dirty)
  const canUndo = useEditor((s) => s.canUndo)
  const saveStatus = useEditor((s) => s.saveStatus)
  const saveMessage = useEditor((s) => s.saveMessage)
  const backup = useEditor((s) => s.backup)
  const selected = items.find((i) => i.id === selectedId)
  const selectedEntry = selected && catalog[selected.type]

  return (
    <aside className="editor-panel" style={{ width: editorConfig.panelWidth }}>
      <header className="editor-panel__header">
        <strong>布局编辑</strong>
        <span className={dirty ? 'editor-panel__dirty' : 'editor-panel__clean'}>{dirty ? '未保存' : '已保存'}</span>
      </header>

      {backup && (
        <div className="editor-panel__banner">
          发现未保存的本地备份（{backup.items.length} 个物件）
          <div className="editor-panel__row">
            <button type="button" onClick={restoreBackup}>恢复</button>
            <button type="button" onClick={discardBackup}>丢弃</button>
          </div>
        </div>
      )}

      <div className="editor-panel__row">
        <button type="button" className="editor-panel__primary" onClick={save} disabled={saveStatus === 'saving'}>
          {saveStatus === 'saving' ? '保存中…' : '保存'}
        </button>
        <button type="button" onClick={undo} disabled={!canUndo}>撤销</button>
      </div>
      {saveMessage && (
        <p className={saveStatus === 'error' ? 'editor-panel__error' : 'editor-panel__hint'}>{saveMessage}</p>
      )}

      <label className="editor-panel__label">
        添加物件
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) addItem(e.target.value)
          }}
        >
          <option value="">选择类型…</option>
          {Object.entries(catalog).map(([type, entry]) => (
            <option key={type} value={type}>
              {entry.label}（{entry.mount === 'wall' ? '墙面' : '地面'}）
            </option>
          ))}
        </select>
      </label>

      <RoomSection />

      <section className="editor-panel__section">
        <h3>选中物件</h3>
        {selected && selectedEntry ? (
          <>
            <p className="editor-panel__mono">
              {selected.id} · {selectedEntry.label}
              <br />x {fmt(selected.position[0])} y {fmt(selected.position[1])} z {fmt(selected.position[2])}
              <br />朝向 {selected.rotationY}°
            </p>
            {selectedEntry.editableProps?.map((ep) => {
              const raw = selected.props?.[ep.key] ?? selectedEntry.defaultProps?.[ep.key]
              const value = typeof raw === 'number' ? raw : ep.min
              return (
                <Slider
                  key={ep.key}
                  label={ep.label}
                  value={value}
                  min={ep.min}
                  max={ep.max}
                  step={ep.step}
                  onChange={(v) => updateProp(selected.id, ep.key, v)}
                />
              )
            })}
            <div className="editor-panel__row">
              <button type="button" onClick={() => rotateSelected(1)} disabled={selectedEntry.mount === 'wall'}>
                旋转 15°
              </button>
              <button type="button" className={pivotMode ? 'is-on' : ''} onClick={togglePivot}>
                精确调整
              </button>
            </div>
            <div className="editor-panel__row">
              <button type="button" onClick={duplicateSelected}>复制</button>
              <button type="button" onClick={deleteSelected}>删除</button>
            </div>
          </>
        ) : (
          <p className="editor-panel__hint">点击场景里的物件，或在下方列表里选</p>
        )}
      </section>

      <section className="editor-panel__section editor-panel__list">
        <h3>物件（{items.length}）</h3>
        <ul>
          {items.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                className={it.id === selectedId ? 'is-on' : ''}
                onClick={() => select(it.id)}
              >
                {catalog[it.type]?.label ?? it.type} <span>{it.id}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="editor-panel__hint">
        拖动吸附 {editorConfig.grid} 米，按住 Shift 自由移动 · R 旋转 · ⌘/Ctrl+D 复制 · Delete 删除 · ⌘/Ctrl+Z 撤销
      </p>
    </aside>
  )
}

/** 房间尺寸：左后角固定，宽度向右收放、进深向前收放；落地窗会跟着墙长自动缩窄 */
function RoomSection() {
  const room = useRoom()
  const R = editorConfig.room
  return (
    <section className="editor-panel__section">
      <h3>房间</h3>
      <Slider
        label="宽度（米）"
        value={room.width}
        min={R.widthRange[0]}
        max={R.widthRange[1]}
        step={R.step}
        onChange={(width) => updateRoom({ ...room, width })}
      />
      <Slider
        label="进深（米）"
        value={room.depth}
        min={R.depthRange[0]}
        max={R.depthRange[1]}
        step={R.step}
        onChange={(depth) => updateRoom({ ...room, depth })}
      />
    </section>
  )
}
