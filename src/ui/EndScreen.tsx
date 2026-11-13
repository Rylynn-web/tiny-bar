import { sceneConfig } from '../config/sceneConfig'
import { stepBackInside } from '../state/flowActions'
import { copy } from './copy'

const E = sceneConfig.ui.entry

/** 结束画面：一句告别 + Step back inside（直接重新进店，拿到新称号） */
export function EndScreen() {
  return (
    <div className="entry-screen" style={{ background: E.scrim, color: E.buttonBackground, fontFamily: E.fontFamily }}>
      <h1>{copy.end.title}</h1>
      <p>{copy.end.body}</p>
      <button type="button" className="flow-button" onClick={stepBackInside} style={{ background: E.buttonBackground, color: E.buttonColor, boxShadow: E.buttonShadow }}>
        {copy.end.again}
      </button>
    </div>
  )
}
