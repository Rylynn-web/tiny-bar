import { useEffect, useMemo, useState } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { closeReceipt } from '../state/flowActions'
import { getSessionLog } from '../state/sessionLog'
import { getTimeZone } from '../state/timezone'
import { copy, fill } from './copy'
import { drawReceipt, fileDate } from './receipt/drawReceipt'

const U = sceneConfig.ui
const R = U.receipt

/** 小票：从上往下"打印"出来；下面 Save receipt（存成 PNG）和 Done */
export function ReceiptView() {
  const { canvas, url, name } = useMemo(() => {
    const log = getSessionLog()
    const tz = getTimeZone()
    const canvas = drawReceipt(log, tz, { menu: copy.menu.items })
    return { canvas, url: canvas.toDataURL('image/png'), name: fill(copy.receipt.fileName, { date: fileDate(tz, log.enteredAt ?? Date.now()) }) }
  }, [])
  const [saving, setSaving] = useState(false)

  // 给 ?debug / 测试用：最近一张小票的图片地址
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __lastReceipt?: string }).__lastReceipt = url
  }, [url])

  const save = async () => {
    setSaving(true)
    try {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
      if (!blob) return
      const file = new File([blob], name, { type: 'image/png' })
      // 手机上能分享文件就弹出系统分享（可以存到相册）；否则直接下载
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.canShare?.({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await nav.share({ files: [file] }).catch(() => undefined)
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = name
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="receipt-screen" style={{ background: U.entry.scrim, fontFamily: U.entry.fontFamily }}>
      <div className="receipt-scroll">
        <div className="receipt-slot" style={{ background: R.ink }} aria-hidden="true" />
        <img
          className="receipt-paper"
          src={url}
          width={R.width}
          alt={copy.receipt.shopName}
          style={{ animationDuration: `${R.printSeconds}s` }}
        />
      </div>
      <div className="receipt-actions">
        <button type="button" className="flow-button" onClick={save} disabled={saving} style={{ background: U.entry.buttonBackground, color: U.entry.buttonColor }}>
          {copy.receipt.save}
        </button>
        <button type="button" className="flow-button ghost" onClick={closeReceipt} style={{ color: U.entry.buttonBackground, borderColor: U.entry.buttonBackground }}>
          {copy.receipt.done}
        </button>
      </div>
    </div>
  )
}
