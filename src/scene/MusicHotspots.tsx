import { useEffect, useMemo, useState } from 'react'
import { MeshBasicMaterial } from 'three'
import { sceneConfig } from '../config/sceneConfig'
import { useLayoutItems } from '../state/layoutStore'
import { openPanel } from '../state/panels'
import { useSceneParams } from '../state/sceneParams'
import { OverlayMeshes, useItemMeshes } from './ItemOverlay'

const H = sceneConfig.musicHotspot

/**
 * 唱机和唱片架可以点：点一下打开歌单。电脑上鼠标移上去时盖一层淡淡的暖白高光、鼠标变手形；
 * 手机没有悬停，直接点。平时盖着的这层不画出来（材质不可见），但照样接收点击。
 */
export function MusicHotspots() {
  const items = useLayoutItems()
  const { palette } = useSceneParams()
  const ids = useMemo(() => items.filter((i) => (H.types as readonly string[]).includes(i.type)).map((i) => i.id), [items])
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
      onTap={() => openPanel('records')}
    />
  )
}
