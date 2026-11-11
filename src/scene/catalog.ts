import { sceneConfig } from '../config/sceneConfig'
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
import { Plant } from './plants/Plant'
import { CityWindow } from './window/CityWindow'
import { BookStack } from './lounge/BookStack'
import { Bookshelf } from './lounge/Bookshelf'
import { CoffeeTable } from './lounge/CoffeeTable'
import { FloorLamp } from './lounge/FloorLamp'
import { MushroomLamp } from './lounge/MushroomLamp'
import { Pouf } from './lounge/Pouf'
import { Sofa } from './lounge/Sofa'
import { StackLamp } from './lounge/StackLamp'
import { Turntable } from './lounge/Turntable'
import { Vase } from './lounge/Vase'
import { ZebraRug } from './lounge/ZebraRug'

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
  sofa: { label: '双人沙发', mount: 'floor', component: Sofa, defaultProps: { color: 'rust' } },
  pouf: { label: '方凳', mount: 'floor', component: Pouf, defaultProps: { color: 'cream' } },
  coffeeTable: { label: '茶几', mount: 'floor', component: CoffeeTable },
  zebraRug: { label: '斑马纹地毯', mount: 'floor', component: ZebraRug, collide: false },
  bookshelf: { label: '书柜', mount: 'floor', component: Bookshelf },
  // 下面这些放在别的家具台面上：也是地面物件，y 设成台面高度，拖动时保持这个高度
  turntable: { label: '唱机', mount: 'floor', component: Turntable },
  stackLamp: { label: '叠环台灯', mount: 'floor', component: StackLamp, defaultProps: { color: 'orange' } },
  mushroomLamp: { label: '蘑菇台灯', mount: 'floor', component: MushroomLamp },
  floorLamp: { label: '落地弧灯', mount: 'floor', component: FloorLamp, collide: false },
  vase: { label: '花瓶', mount: 'floor', component: Vase, defaultProps: { color: 'cream' } },
  bookStack: { label: '书摞', mount: 'floor', component: BookStack },
  cityWindow: {
    label: '城市落地窗',
    mount: 'wall',
    component: CityWindow,
    lockY: true,
    defaultProps: { width: sceneConfig.cityWindow.defaultWidth },
    editableProps: [
      {
        key: 'width',
        label: '宽度（米）',
        min: sceneConfig.cityWindow.minWidth,
        max: sceneConfig.cityWindow.maxWidth,
        step: 0.1,
      },
    ],
  },
  // 植物：叶片会自然地和别的东西交叠，不参与重叠检测
  plant: {
    label: '盆栽',
    mount: 'floor',
    component: Plant,
    collide: false,
    defaultProps: { species: 'monstera' },
  },
}
