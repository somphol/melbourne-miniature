import assert from 'node:assert/strict'
import { FAMILIES, building } from '../src/scene/buildings'
import { LANDMARKS } from '../src/scene/geo'
import { Kit } from '../src/scene/kit'
import { LANDMARK_BUILDERS, LANDMARK_ENVELOPES } from '../src/scene/landmarks'

function finiteBox(kit: Kit) {
  const b = kit.bounds()
  for (const v of [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z]) {
    assert.ok(Number.isFinite(v), 'non-finite geometry bound')
  }
  return b
}

for (const site of LANDMARKS) {
  const kit = new Kit(null)
  LANDMARK_BUILDERS[site.id](kit, 0, 0)
  assert.ok(kit.hasGeometry(), `${site.id} produced no geometry`)
  const b = finiteBox(kit)
  const env = LANDMARK_ENVELOPES[site.id]
  const w = b.max.x - b.min.x,
    d = b.max.z - b.min.z,
    h = b.max.y - 0.58
  assert.ok(w <= env.w + 0.05, `${site.id} width ${w.toFixed(2)} exceeds ${env.w}`)
  assert.ok(d <= env.d + 0.05, `${site.id} depth ${d.toFixed(2)} exceeds ${env.d}`)
  assert.ok(h <= env.maxY + 0.05, `${site.id} height ${h.toFixed(2)} exceeds ${env.maxY}`)
  assert.ok(b.min.y >= 0.5, `${site.id} sinks below the tray`)
}

const metrics = new Map<string, { boxes: number; width: number; height: number }>()
for (const family of FAMILIES) {
  const kit = new Kit(null)
  kit.at(0, 0, 0)
  building(kit, family, 0.36, 0.32, 1.2, 0)
  assert.ok(kit.hasGeometry(), `${family} produced no geometry`)
  const b = finiteBox(kit)
  assert.ok(kit.counts[family] === 1, `${family} was not counted`)
  metrics.set(family, {
    boxes: kit.primitiveCount(),
    width: b.max.x - b.min.x,
    height: b.max.y - b.min.y,
  })
}
assert.equal(FAMILIES.length, 9)
assert.equal(metrics.size, 9)
const shapes = new Set(
  [...metrics.values()].map((m) => `${m.width.toFixed(2)}:${m.height.toFixed(2)}:${m.boxes}`),
)
assert.equal(shapes.size, 9, 'building families are not distinct enough')
for (const [name, m] of metrics) {
  assert.ok(m.width > 0.2 && m.height > 0.4, `${name} is degenerate`)
}

console.log(`geometry: ${LANDMARKS.length} landmarks in envelope, ${FAMILIES.length} distinct building families`)
