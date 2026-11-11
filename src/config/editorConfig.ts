// 布局编辑器的参数。只被编辑器代码引用，不会进入生产包（编辑器只在开发环境 ?edit 下加载）。

export const editorConfig = {
  grid: 0.1,
  rotateStepDeg: 15,
  historyLimit: 50,
  duplicateOffset: 0.3,
  // 新物件放在哪：地面物件放房间中央，墙面物件放后墙这个高度
  wallItemY: 1.5,
  outlineColor: '#FFB347',
  outlineHiddenColor: '#8A6A3A',
  outlineStrength: 4,
  overlapColor: '#E5484D',
  overlapOpacity: 0.35,
  // 重叠检测前把两个包围盒各缩小这么多（米）：椅子塞在桌边这种轻微交叠不算重叠
  overlapTolerance: 0.03,
  seatColor: '#3FA7D6',
  seatMarkerRadius: 0.05,
  seatArrowLength: 0.18,
  neighborLineColor: '#3FA7D6',
  neighborLineWidth: 2,
  pivotScale: 90,
  backupKey: 'tavern.layout.backup',
  saveEndpoint: '/__layout/save',
  panelWidth: 260,
  // 房间尺寸滑杆的范围（米）
  room: { widthRange: [5, 9] as [number, number], depthRange: [4, 7] as [number, number], step: 0.1 },
  } as const
