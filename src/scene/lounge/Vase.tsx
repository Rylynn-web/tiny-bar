import { useMemo } from 'react'
import { DoubleSide, Quaternion, SphereGeometry, Vector3 } from 'three'
import { sceneConfig } from '../../config/sceneConfig'
import { useSceneParams } from '../../state/sceneParams'
import { InstancedMatte, type InstanceItem } from '../primitives/InstancedLathe'
import { Matte } from '../primitives/Matte'
import { seededRandom } from '../primitives/canvasTexture'
import { useLathe } from '../primitives/useLathe'
import type { CatalogProps } from '../catalogTypes'
import { paletteColor } from '../paletteColor'

const V = sceneConfig.lounge.vase
const berryGeometry = new SphereGeometry(1, 10, 8)
const up = new Vector3(0, 1, 0)

/** 花瓶 + 几根细枝 + 枝头的浆果（实例化）。原点在瓶底中心。props.color 瓶身色，props.seed 换一种枝条形状 */
export function Vase({ props }: CatalogProps) {
  const { palette } = useSceneParams()
  const geo = useLathe(V.profile, sceneConfig.detail.smallLatheSegments * 2)
  const topY = Math.max(...V.profile.map((p) => p[1]))
  const seed = typeof props.seed === 'number' ? props.seed : V.seed

  const { stems, berries } = useMemo(() => {
    const rand = seededRandom(seed)
    const stems: { mid: Vector3; quaternion: Quaternion; length: number }[] = []
    const berries: InstanceItem[] = []
    for (let i = 0; i < V.stems; i++) {
      const around = (i / V.stems) * Math.PI * 2 + rand() * 0.6
      const tilt = V.stemSpread * (0.3 + 0.7 * rand())
      const length = V.stemLength[0] + rand() * (V.stemLength[1] - V.stemLength[0])
      const dir = new Vector3(Math.sin(tilt) * Math.cos(around), Math.cos(tilt), Math.sin(tilt) * Math.sin(around))
      const base = new Vector3(0, topY * 0.8, 0)
      const tip = base.clone().addScaledVector(dir, length)
      stems.push({
        mid: base.clone().add(tip).multiplyScalar(0.5),
        quaternion: new Quaternion().setFromUnitVectors(up, dir),
        length,
      })
      for (let b = 0; b < V.berriesPerStem; b++) {
        const along = 1 - b * 0.12
        const p = base.clone().addScaledVector(dir, length * along)
        p.x += (rand() - 0.5) * V.berryScatter
        p.y += (rand() - 0.5) * V.berryScatter
        p.z += (rand() - 0.5) * V.berryScatter
        const r = V.berryRadius * (0.75 + 0.5 * rand())
        berries.push({
          position: [p.x, p.y, p.z],
          scale: [r, r, r],
          color: palette[V.colors[(i + b) % V.colors.length]],
        })
      }
    }
    return { stems, berries }
  }, [seed, topY, palette])

  return (
    <group>
      <mesh geometry={geo} castShadow receiveShadow>
        <Matte color={paletteColor(palette, props.color, 'cream')} side={DoubleSide} shadowSide={DoubleSide} />
      </mesh>
      {stems.map((s, i) => (
        <mesh key={i} position={s.mid} quaternion={s.quaternion}>
          <cylinderGeometry args={[V.stemRadius, V.stemRadius, s.length, 5]} />
          <Matte color={palette.wood} />
        </mesh>
      ))}
      <InstancedMatte geometry={berryGeometry} items={berries} />
    </group>
  )
}
