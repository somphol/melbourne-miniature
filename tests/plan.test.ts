import assert from 'node:assert/strict'
import {
  LANDMARKS,
  PARKS,
  RESERVED,
  insideLand,
  inWater,
  segmentDistance,
  type Point,
} from '../src/scene/geo'
import { GRID_ANGLE, networkComponents, planCity } from '../src/scene/plan'

const plan = planCity(RESERVED, insideLand)
const components = networkComponents(plan.network)
assert.equal(components.length, 1, `road graph has ${components.length} components`)
assert.ok(plan.network.nodes.length > 400, `only ${plan.network.nodes.length} road nodes`)
assert.ok(plan.network.edges.length > 600, `only ${plan.network.edges.length} road edges`)
assert.ok(plan.parcels.length > 120, `only ${plan.parcels.length} parcels`)
assert.ok(plan.blocks.length > 80, `only ${plan.blocks.length} blocks`)

// Every node is on land and finite.
for (const node of plan.network.nodes) {
  assert.ok(Number.isFinite(node.x) && Number.isFinite(node.z), 'non-finite node')
  assert.ok(insideLand(node.x, node.z), `road node off land at ${node.x.toFixed(2)},${node.z.toFixed(2)}`)
}

// Parcels: on land, clear of reserved sites and roads, and non-overlapping in the grid frame.
const cos = Math.cos(GRID_ANGLE),
  sin = Math.sin(GRID_ANGLE)
const local = (x: number, z: number): Point => [x * cos + z * sin, -x * sin + z * cos]
for (const parcel of plan.parcels) {
  assert.ok(insideLand(parcel.x, parcel.z), `parcel off land at ${parcel.x.toFixed(2)},${parcel.z.toFixed(2)}`)
  const corners: Point[] = [
    [-parcel.w / 2, -parcel.d / 2],
    [parcel.w / 2, -parcel.d / 2],
    [parcel.w / 2, parcel.d / 2],
    [-parcel.w / 2, parcel.d / 2],
  ].map(([lx, lz]) => [
    parcel.x + lx * cos - lz * sin,
    parcel.z + lx * sin + lz * cos,
  ] as Point)
  for (const [x, z] of corners) assert.ok(insideLand(x, z), 'parcel corner off land')
  for (const site of RESERVED) {
    const overlap =
      Math.abs(parcel.x - site.x) < (parcel.w + site.w) / 2 - 0.01 &&
      Math.abs(parcel.z - site.z) < (parcel.d + site.d) / 2 - 0.01
    assert.ok(!overlap, `parcel overlaps reserved ${site.id}`)
  }
  for (const edge of plan.network.edges) {
    const A = plan.network.nodes[edge.a],
      B = plan.network.nodes[edge.b],
      dx = B.x - A.x,
      dz = B.z - A.z,
      len = Math.hypot(dx, dz)
    if (!len) continue
    const nu = Math.abs((-dz * cos - dx * sin) / len),
      nv = Math.abs((-dz * sin + dx * cos) / len)
    const reach = (nu * parcel.w + nv * parcel.d) / 2 + edge.width / 2 + 0.02
    const d = segmentDistance(parcel.x, parcel.z, [A.x, A.z], [B.x, B.z])
    assert.ok(d >= reach - 0.006, `parcel near ${edge.name} (${d.toFixed(3)} < ${reach.toFixed(3)})`)
  }
}
for (let i = 0; i < plan.parcels.length; i++) {
  const a = plan.parcels[i],
    la = local(a.x, a.z)
  for (let j = i + 1; j < plan.parcels.length; j++) {
    const b = plan.parcels[j],
      lb = local(b.x, b.z)
    const overlapX = Math.abs(la[0] - lb[0]) < (a.w + b.w) / 2 - 1e-4
    const overlapZ = Math.abs(la[1] - lb[1]) < (a.d + b.d) / 2 - 1e-4
    assert.ok(!(overlapX && overlapZ), `parcels overlap at ${a.x.toFixed(2)},${a.z.toFixed(2)}`)
  }
}

// Bridges: dry ends, wet midpoint, and an explicit deck edge.
for (const bridge of plan.bridges) {
  assert.ok(insideLand(bridge.x, bridge.z0), `${bridge.id} north end is not on land`)
  assert.ok(insideLand(bridge.x, bridge.z1), `${bridge.id} south end is not on land`)
  assert.ok(inWater(bridge.x, (bridge.z0 + bridge.z1) / 2), `${bridge.id} midpoint is not water`)
  assert.ok(
    plan.network.edges.some((e) => e.bridge && e.name === bridge.name),
    `${bridge.name} has no bridge edge`,
  )
}

// Landmark anchors sit on land and do not collide with each other.
for (const site of LANDMARKS) {
  assert.ok(insideLand(site.x, site.z), `${site.id} anchor is not on land`)
  for (const other of LANDMARKS) {
    if (other === site) continue
    const overlap =
      Math.abs(site.x - other.x) < (site.w + other.w) / 2 &&
      Math.abs(site.z - other.z) < (site.d + other.d) / 2
    assert.ok(!overlap, `${site.id} lot overlaps ${other.id}`)
  }
}
for (const park of PARKS) assert.ok(insideLand(park.x, park.z), `${park.id} park is not on land`)

console.log(
  `plan: ${plan.network.nodes.length} nodes, ${plan.network.edges.length} edges, ` +
    `${plan.parcels.length} parcels, ${plan.blocks.length} blocks, ${plan.bridges.length} bridges`,
)
