import { seats } from '../../config/seatConfig'
import { BackCounter } from './BackCounter'
import { BarCounter } from './BarCounter'
import { BarStool } from './BarStool'
import { CoffeeStation } from './CoffeeStation'
import { PendantLamps } from './PendantLamps'
import { WallShelves } from './WallShelves'

/** 吧台区：后操作台 + 置物架 + 咖啡区 + L 形吧台 + 吧凳 + 吊灯 */
export function BarArea() {
  const stools = seats.filter((s) => s.zone === 'bar')
  return (
    <group>
      <BackCounter />
      <WallShelves />
      <CoffeeStation />
      <BarCounter />
      {stools.map((s) => (
        <BarStool key={s.id} position={[s.position[0], 0, s.position[2]]} />
      ))}
      <PendantLamps />
    </group>
  )
}
