import { useEffect, useMemo, useRef } from 'react'
import type { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { DoubleSide, InstancedBufferAttribute, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, type BufferGeometry, type InstancedMesh } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSeats } from '../../config/seatConfig'
import { useFlow } from '../../state/flow'
import { TitleTag } from './TitleTag'
import { MusicNote } from './MusicNote'
import { useNowPlaying } from '../../state/nowPlaying'
import { Vector3 } from 'three'
import { MAX_GUESTS, choosePartner, effectiveState, useGuests } from '../../state/guests'
import { useSceneParams } from '../../state/sceneParams'
import { Glow } from '../primitives/Glow'
import { bookHalfGeometry, bubbleTexture, partGeometry as G } from './parts'
import { Rig, type RigInput } from './rig'
import { cellOffset, getFaceAtlas } from './faceAtlas'
import { faceAtlas } from '../../config/expressions'
import type { MenuId } from '../../config/menu'
import { createMenuMaterial, menuCell, menuPlaneGeometry } from './menuAtlas'

const B = sceneConfig.buddy
const P = B.props
const M = sceneConfig.material
const hidden = new Matrix4().makeScale(0, 0, 0)
const noteRight = new Vector3()
const notePos = new Vector3()
const noteScale = new Vector3(1, 1, 1)

// 每种零件 / 道具一组实例：名字 → 每个小人几份
const SLOTS = {
  body: 1,
  legs: 2,
  arms: 2,
  head: 1,
  eyes: 1,
  cheeks: 1,
  drink: 1,
  food: 1,
  bookHalves: 2,
  page: 1,
  laptopBase: 1,
  laptopLid: 1,
  screen: 1,
  bubble: 1,
} as const
type Slot = keyof typeof SLOTS

/**
 * 座位上的所有小人：每人一套不显示的层级节点（rig.ts）摆姿势，
 * 所有人的同一种零件 / 道具合成一组实例化网格（几何体和材质共享），8 个人也只多十几次绘制。
 */
export function Guests() {
  const seats = useSeats()
  const guests = useGuests()
  const flow = useFlow()
  const tagRef = useRef<Mesh>(null)
  const noteRef = useRef<Mesh>(null)
  const nowPlaying = useNowPlaying()
  const { palette, buddy } = useSceneParams()
  const rigs = useRef(new Map<string, Rig>())
  const meshes = useRef<Partial<Record<Slot, InstancedMesh | null>>>({})

  // 共享材质：小人是黑白的（不用调色板），道具颜色来自调色板
  const bodyMat = useMemo(
    () =>
      new MeshPhysicalMaterial({
        roughness: B.roughness,
        metalness: 0,
        sheen: B.sheen,
        sheenRoughness: B.sheenRoughness,
        sheenColor: '#ffffff',
        envMapIntensity: M.envMapIntensity,
      }),
    [],
  )
  useEffect(() => {
    bodyMat.color.set(buddy.bodyColor)
  }, [bodyMat, buddy.bodyColor])
  // 脸：表情图集 + 每个实例自己的格子偏移（切换表情只改偏移）
  const atlas = useMemo(() => getFaceAtlas(buddy.eyeColor), [buddy.eyeColor])
  const faceMat = useMemo(() => createFaceMaterial(), [])
  useEffect(() => {
    faceMat.map = atlas
    faceMat.needsUpdate = true
  }, [faceMat, atlas])
  const eyesGeo = useMemo(() => withCells(G.eyes), [])
  const menuMat = useMemo(() => createMenuMaterial(), [])
  const drinkGeo = useMemo(() => withCells(menuPlaneGeometry()), [])
  const foodGeo = useMemo(() => withCells(menuPlaneGeometry()), [])
  const cheeksGeo = useMemo(() => withCells(G.cheeks), [])
  const bookHalf = useMemo(() => bookHalfGeometry(palette[P.book.pageColor], palette[P.book.coverColor]), [palette])
  const bubbleMap = useMemo(() => bubbleTexture(), [])
  useEffect(() => () => bookHalf.dispose(), [bookHalf])

  // 当前坐着的人（最多 8 个）和每人的交谈对象
  const active = useMemo(() => {
    const byId = new Map(seats.map((s) => [s.id, s]))
    const list: (RigInput & { seed: number; self: boolean; dj: boolean })[] = []
    for (const seat of seats) {
      const g = guests[seat.id]
      if (!g || list.length >= MAX_GUESTS) continue
      // 交谈对象：同桌 / 同一件家具优先；群里其他有人的座位（不含对象、不在桌边的）用来偶尔扭头看看
      const partner = choosePartner(seat, byId, guests)
      const others = seat.neighbors
        .filter((id) => guests[id] && id !== partner?.id)
        .map((id) => byId.get(id)!)
        .filter((o) => o && !o.desk && !seat.desk)
      list.push({
        seat,
        partner,
        others,
        state: effectiveState(seat, g, guests),
        drink: g.drink,
        food: g.food,
        seed: g.seed,
        emote: g.emote ?? null,
        self: !!g.self,
        dj: !!nowPlaying && !!g.id && g.id === nowPlaying.by,
      })
    }
    return list
  }, [seats, guests, nowPlaying])

  const seen = useRef<Set<string> | null>(null)
  useFrame(({ camera, clock }, delta) => {
    const now = clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    // 离开座位的人：丢掉他的骨架
    const ids = new Set(active.map((a) => a.seat.id))
    for (const id of rigs.current.keys()) if (!ids.has(id)) rigs.current.delete(id)
    // 有人新坐下：已经坐着的邻座跟他打个招呼（开场时坐着的人不算）
    if (seen.current) {
      for (const a of active) {
        if (seen.current.has(a.seat.id)) continue
        for (const n of a.seat.neighbors) rigs.current.get(n)?.greet(now)
      }
    }
    seen.current = ids

    const write = (slot: Slot, i: number, m: Matrix4) => meshes.current[slot]?.setMatrixAt(i, m)
    active.forEach((a, i) => {
      let rig = rigs.current.get(a.seat.id)
      if (!rig) {
        rig = new Rig(a.seed, now)
        rigs.current.set(a.seat.id, rig)
      }
      rig.update(a, now, dt, camera.quaternion)
      write('body', i, rig.body.matrixWorld)
      write('head', i, rig.head.matrixWorld)
      write('eyes', i, rig.eyes.matrixWorld)
      write('cheeks', i, rig.head.matrixWorld)
      setCell(eyesGeo, i, rig.eyeCell)
      setCell(cheeksGeo, i, rig.blushCell)
      for (let s = 0; s < 2; s++) {
        write('legs', i * 2 + s, rig.hips[s].matrixWorld)
        write('arms', i * 2 + s, rig.shoulders[s].matrixWorld)
        write('bookHalves', i * 2 + s, rig.pops.book.scale > 0 ? rig.bookHalves[s].matrixWorld : hidden)
      }
      write('page', i, rig.pops.book.scale > 0 ? rig.page.matrixWorld : hidden)
      const laptopOn = rig.pops.laptop.scale > 0
      write('laptopBase', i, laptopOn ? rig.laptop.matrixWorld : hidden)
      write('laptopLid', i, laptopOn ? rig.lid.matrixWorld : hidden)
      write('screen', i, laptopOn ? rig.lid.matrixWorld : hidden)
      const onTable = !!a.seat.table
      write('drink', i, onTable && rig.shownDrink ? rig.drinkMatrix : hidden)
      write('food', i, onTable && rig.shownFood ? rig.foodMatrix : hidden)
      if (rig.shownDrink) setMenuCell(drinkGeo, i, rig.shownDrink)
      if (rig.shownFood) setMenuCell(foodGeo, i, rig.shownFood)
      write('bubble', i, rig.pops.bubble.scale > 0 ? rig.bubbleMatrix : hidden)
    })
    // 自己头顶的称号标签
    const tag = tagRef.current
    if (tag) {
      const me = active.find((a) => a.self)
      const rig = me && rigs.current.get(me.seat.id)
      tag.visible = !!rig
      if (rig) tag.matrix.copy(rig.tagMatrix)
      tag.matrixWorldNeedsUpdate = true
    }
    // 放歌那个人头顶的音符：头的右上方，轻轻上下浮动
    const note = noteRef.current
    if (note) {
      const dj = active.find((a) => a.dj)
      const rig = dj && rigs.current.get(dj.seat.id)
      note.visible = !!rig
      if (rig) {
        const N = sceneConfig.musicNote
        const right = noteRight.set(1, 0, 0).applyQuaternion(camera.quaternion)
        notePos.copy(rig.headTop).addScaledVector(right, N.side)
        notePos.y += N.lift + Math.sin((now * Math.PI * 2) / N.bobSeconds) * N.bob
        note.matrix.compose(notePos, camera.quaternion, noteScale)
      }
      note.matrixWorldNeedsUpdate = true
    }
    for (const slot of Object.keys(SLOTS) as Slot[]) {
      const mesh = meshes.current[slot]
      if (!mesh) continue
      mesh.count = active.length * SLOTS[slot]
      mesh.instanceMatrix.needsUpdate = true
    }
    ;(drinkGeo.attributes.instanceCell as InstancedBufferAttribute).needsUpdate = true
    ;(foodGeo.attributes.instanceCell as InstancedBufferAttribute).needsUpdate = true
    ;(eyesGeo.attributes.instanceCell as InstancedBufferAttribute).needsUpdate = true
    ;(cheeksGeo.attributes.instanceCell as InstancedBufferAttribute).needsUpdate = true
  })

  const max = (slot: Slot) => MAX_GUESTS * SLOTS[slot]
  const ref = (slot: Slot) => (m: InstancedMesh | null) => {
    meshes.current[slot] = m
  }
  // 小人零件投影；道具是小物件，只接收阴影
  const part = { castShadow: true, receiveShadow: true, frustumCulled: false }
  const prop = { castShadow: false, receiveShadow: true, frustumCulled: false }

  return (
    <group>
      <instancedMesh ref={ref('body')} args={[G.body, bodyMat, max('body')]} {...part} />
      <instancedMesh ref={ref('legs')} args={[G.leg, bodyMat, max('legs')]} {...part} />
      <instancedMesh ref={ref('arms')} args={[G.arm, bodyMat, max('arms')]} {...part} />
      <instancedMesh ref={ref('head')} args={[G.head, bodyMat, max('head')]} {...part} />
      {/* 脸：眼睛贴片（眨眼沿 Y 压扁）、腮红贴片，共用一张表情图集 */}
      <instancedMesh ref={ref('eyes')} args={[eyesGeo, faceMat, max('eyes')]} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={ref('cheeks')} args={[cheeksGeo, faceMat, max('cheeks')]} frustumCulled={false} renderOrder={1} />

      {/* 桌上点的东西：图片立在桌面上（图集 + 每个实例的格子），饮品一组、小食一组 */}
      <instancedMesh ref={ref('drink')} args={[drinkGeo, menuMat, max('drink')]} {...prop} />
      <instancedMesh ref={ref('food')} args={[foodGeo, menuMat, max('food')]} {...prop} />
      <instancedMesh ref={ref('bookHalves')} args={[bookHalf, undefined, max('bookHalves')]} {...prop}>
        <meshStandardMaterial vertexColors roughness={M.roughness} metalness={0} envMapIntensity={M.envMapIntensity} />
      </instancedMesh>
      <instancedMesh ref={ref('page')} args={[G.page, undefined, max('page')]} {...prop}>
        <meshStandardMaterial color={palette[P.book.pageColor]} roughness={M.roughness} metalness={0} side={DoubleSide} />
      </instancedMesh>
      <instancedMesh ref={ref('laptopBase')} args={[G.laptopBase, undefined, max('laptopBase')]} {...prop}>
        <meshStandardMaterial color={palette[P.laptop.color]} roughness={M.roughness} metalness={0} envMapIntensity={M.envMapIntensity} />
      </instancedMesh>
      <instancedMesh ref={ref('laptopLid')} args={[G.laptopLid, undefined, max('laptopLid')]} {...prop}>
        <meshStandardMaterial color={palette[P.laptop.color]} roughness={M.roughness} metalness={0} envMapIntensity={M.envMapIntensity} />
      </instancedMesh>
      {/* 屏幕：夜晚微微发光（和收银屏幕同一组亮度） */}
      <instancedMesh ref={ref('screen')} args={[G.laptopScreen, undefined, max('screen')]} frustumCulled={false}>
        <Glow color={palette[P.laptop.screenColor]} group="screen" />
      </instancedMesh>
      {flow.title && <TitleTag title={flow.title} meshRef={tagRef} />}
      {nowPlaying && <MusicNote meshRef={noteRef} paused={!nowPlaying.playing} />}
      {/* "…" 气泡：正对镜头，不受光照 */}
      <instancedMesh ref={ref('bubble')} args={[G.bubble, undefined, max('bubble')]} frustumCulled={false} renderOrder={8}>
        <meshBasicMaterial map={bubbleMap} transparent depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

/** 脸部贴片的材质：不受光照（眼睛始终是纯色），透明叠在头上；贴图坐标按每个实例的格子偏移 */
function createFaceMaterial() {
  const m = new MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  const scaleU = 1 / faceAtlas.cols
  const scaleV = 1 / faceAtlas.rows
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 instanceCell;')
      .replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = vMapUv * vec2(${scaleU.toFixed(4)}, ${scaleV.toFixed(4)}) + instanceCell;\n#endif`,
      )
  }
  return m
}

/** 给贴片几何体加上每个实例的"图集格子偏移"属性（复制一份，眼睛和腮红各用各的） */
function withCells(source: BufferGeometry) {
  const g = source.clone()
  const arr = new Float32Array(MAX_GUESTS * 2)
  const [u, v] = cellOffset(faceAtlas.cells.default)
  for (let i = 0; i < MAX_GUESTS; i++) {
    arr[i * 2] = u
    arr[i * 2 + 1] = v
  }
  g.setAttribute('instanceCell', new InstancedBufferAttribute(arr, 2))
  return g
}

function setMenuCell(g: BufferGeometry, i: number, id: MenuId) {
  const [u, v] = menuCell(id)
  ;(g.attributes.instanceCell as InstancedBufferAttribute).setXY(i, u, v)
}

function setCell(g: BufferGeometry, i: number, cell: number) {
  const [u, v] = cellOffset(cell)
  const a = g.attributes.instanceCell as InstancedBufferAttribute
  a.setXY(i, u, v)
}
