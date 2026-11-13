import { useEffect, useMemo, useState } from 'react'
import { MeshBasicMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useLayoutItems } from '../state/layoutStore'
import { openPanel } from '../state/panels'
import { requestLeave } from '../state/flowActions'
import { useSceneParams } from '../state/sceneParams'
import { OverlayMeshes, useItemMeshes } from './ItemOverlay'

const H = sceneConfig.hotspot
type HotspotType = keyof typeof H.targets

/**
 * 场景里能点的东西：唱机 / 唱片架打开歌单，门打开离开确认框（哪个打开什么在 sceneConfig.hotspot）。
 * 电脑上鼠标移上去时盖一层淡淡的暖白高光、鼠标变手形；手机没有悬停，直接点。
 * 平时盖着的这层不画出来（材质不可见），但照样接收点击。
 */
export function Hotspots() {
  const items = useLayoutItems()
  const { palette } = useSceneParams()
  const typeOf = useMemo(() => new Map(items.filter((i) => i.type in H.targets).map((i) => [i.id, i.type as HotspotType])), [items])
  const ids = useMemo(() => [...typeOf.keys()], [typeOf])
  const targets = useItemMeshes(ids)
  const [hovered, setHovered] = useState<string | null>(null)

  const idle = useMemo(() => new MeshBasicMaterial({ visible: false }), [])
  const glow = useMemo(
    () =>
      new MeshBasicMaterial({
        transparent: true,
        opacity: H.hoverOpacity,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [],
  )
  useEffect(() => {
    glow.color.set(palette[H.color])
  }, [glow, palette])
  useEffect(
    () => () => {
      idle.dispose()
      glow.dispose()
    },
    [idle, glow],
  )

  // 悬停时鼠标变手形；组件卸载时恢复
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [hovered])

  return (
    <OverlayMeshes
      targets={targets}
      material={idle}
      materialFor={(id) => (id === hovered ? glow : idle)}
      renderOrder={6}
      onHover={setHovered}
      onTap={(id) => {
        const action = H.targets[typeOf.get(id)!]
        if (action === 'leave') requestLeave()
        else openPanel(action)
      }}
    />
  )
}
