import { useEffect } from 'react'
import { sceneConfig } from '../config/sceneConfig'
import { track } from '../net/track'
import { stepInside } from '../state/flowActions'
import { copy } from './copy'

const E = sceneConfig.ui.entry

/** 开始画面：店名、一句话、"Step inside" 按钮（这一下点击同时解锁浏览器音频） */
export function EntryScreen() {
  useEffect(() => track('entry_shown'), [])
  return (
    <div className="entry-screen" style={{ background: E.scrim, color: E.buttonBackground, fontFamily: E.fontFamily }}>
      <h1>{copy.entry.name}</h1>
      <p>{copy.entry.tagline}</p>
      <button
        type="button"
        className="flow-button"
        onClick={stepInside}
        style={{ background: E.buttonBackground, color: E.buttonColor, boxShadow: E.buttonShadow }}
      >
        {copy.entry.stepInside}
      </button>
    </div>
  )
}
