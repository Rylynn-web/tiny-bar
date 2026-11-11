import { sceneConfig } from '../../config/sceneConfig'
import { seats } from '../../config/seatConfig'
import { useSceneParams } from '../../state/sceneParams'
import { RoundedCylinder } from '../primitives/RoundedCylinder'
import { DiningTable } from './DiningTable'
import { ShellChair } from './ShellChair'

/** 两张双人桌：桌子按 sceneConfig.tables 摆放，椅子跟着 seatConfig 的座位走 */
export function DiningArea() {
  const { palette } = useSceneParams()
  const rug = sceneConfig.roundRug
  return (
    <>
      {(['A', 'B'] as const).map((key) => {
        const t = sceneConfig.tables[key]
        const tableSeats = seats.filter((s) => s.zone === `table${key}`)
        return (
          <group key={key}>
            {'rug' in t && t.rug && (
              <RoundedCylinder
                radius={rug.radius}
                height={rug.thickness}
                position={t.position}
                color={palette.cream}
                tier="rod"
                segments={sceneConfig.detail.cylinderSegments.large}
                castShadow={false}
              />
            )}
            <DiningTable position={t.position} />
            {tableSeats.map((seat, i) => (
              <ShellChair
                key={seat.id}
                color={palette[t.chairColors[i]]}
                position={[seat.position[0], 0, seat.position[2]]}
                rotationY={seat.rotationY}
              />
            ))}
          </group>
        )
      })}
    </>
  )
}
