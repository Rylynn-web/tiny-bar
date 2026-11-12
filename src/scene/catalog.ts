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
import { ArtBokeh, ArtHorizon, ArtOrb } from './decor/ArtPieces'
import { MirrorStrip } from './decor/MirrorStrip'
import { OrbSconce } from './decor/OrbSconce'
import { RecordWall } from './decor/RecordWall'
import { ShelfSet } from './decor/ShelfSet'
import { WallPlate } from './decor/WallPlate'
import { WallRod } from './decor/WallRod'

const D = sceneConfig.decor
// 画作 / 相框 / 圆盘：换种子 = 换一幅，换配色 = 从强调色里重新组合
const reseed = [
  { label: '换一幅', reseed: 'seed' },
  { label: '换配色', reseed: 'paletteSeed' },
]
const seeds = { seed: 1, paletteSeed: 0 }

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
    // 宽度会随房间和位置自动变化，窗框不做网格合并
    merge: false,
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
  // ── 墙面装饰（强调色只用在这里）──
  artBokeh: { label: '画·光斑', mount: 'wall', component: ArtBokeh, defaultProps: { ...seeds }, editorActions: reseed },
  artOrb: { label: '画·光球', mount: 'wall', component: ArtOrb, defaultProps: { ...seeds }, editorActions: reseed },
  artHorizon: { label: '画·地平线', mount: 'wall', component: ArtHorizon, defaultProps: { ...seeds }, editorActions: reseed },
  wallPlate: { label: '墙上圆盘', mount: 'wall', component: WallPlate, defaultProps: { ...seeds }, editorActions: reseed },
  mirrorStrip: {
    label: '镜子条',
    mount: 'wall',
    component: MirrorStrip,
    defaultProps: { count: D.mirror.count },
    editableProps: [{ key: 'count', label: '块数', min: D.mirror.countRange[0], max: D.mirror.countRange[1], step: 1 }],
  },
  orbSconce: { label: '球形壁灯', mount: 'wall', component: OrbSconce },
  recordWall: {
    label: '唱片墙',
    mount: 'wall',
    component: RecordWall,
    defaultProps: { ...seeds, cols: D.recordWall.cols, rows: D.recordWall.rows },
    editableProps: [
      { key: 'cols', label: '列数', min: D.recordWall.colsRange[0], max: D.recordWall.colsRange[1], step: 1 },
      { key: 'rows', label: '行数', min: D.recordWall.rowsRange[0], max: D.recordWall.rowsRange[1], step: 1 },
    ],
    editorActions: reseed,
  },
  shelfSet: { label: '层板组', mount: 'wall', component: ShelfSet, defaultProps: { ...seeds }, editorActions: reseed },
  wallRod: {
    label: '墙面细杆',
    mount: 'wall',
    component: WallRod,
    defaultProps: { length: D.rod.length },
    editableProps: [{ key: 'length', label: '长度（米）', min: D.rod.lengthRange[0], max: D.rod.lengthRange[1], step: 0.1 }],
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
