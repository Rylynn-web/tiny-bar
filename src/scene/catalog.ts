import type { CatalogEntry } from './catalogTypes'
import { BackCounter } from './bar/BackCounter'
import { BarCounter } from './bar/BarCounter'
import { BarStool } from './bar/BarStool'
import { PendantLamp } from './bar/PendantLamp'
import { WallShelf } from './bar/WallShelf'
import { DiningTable } from './furniture/DiningTable'
import { RoundRug } from './furniture/RoundRug'
import { ShellChair } from './furniture/ShellChair'
import { Door } from './room/Door'

/** 物件目录：layout.json 里的 type → 组件、安装方式、默认参数 */
export const catalog: Record<string, CatalogEntry> = {
  diningTable: { label: '方桌', mount: 'floor', component: DiningTable },
  shellChair: { label: '壳形椅', mount: 'floor', component: ShellChair, defaultProps: { color: 'cream' } },
  roundRug: { label: '圆地毯', mount: 'floor', component: RoundRug, collide: false, defaultProps: { color: 'cream' } },
  barCounter: { label: 'L 形吧台', mount: 'floor', component: BarCounter },
  backCounter: { label: '后操作台', mount: 'floor', component: BackCounter },
  barStool: { label: '吧凳', mount: 'floor', component: BarStool },
  pendantLamp: { label: '吊灯', mount: 'floor', component: PendantLamp, collide: false },
  wallShelf: {
    label: '浮板置物架',
    mount: 'wall',
    component: WallShelf,
    defaultProps: { items: 'mug', width: 1.2, seed: 0 },
  },
  door: { label: '门', mount: 'wall', component: Door },
}
