import {
  BRIDGES,
  districtAt,
  inPolygon,
  insideLand,
  northBank,
  segmentDistance,
  southBank,
  type Point,
} from './geo'

export type Footprint = {
  x: number
  z: number
  w: number
  d: number
  height: number
  rot?: number
}

export type RoadNode = { x: number; z: number; neighbors: number[]; signal: number }
export type RoadEdge = {
  a: number
  b: number
  name: string
  width: number
  tram?: boolean
  bridge?: boolean
}
export type RoadNetwork = { nodes: RoadNode[]; edges: RoadEdge[] }
export type CityBlock = { boundary: Point[]; district: string }
export type BuildingParcel = Footprint & { rot: number; district: string; blockId: number }
export type BridgePlan = {
  id: string
  x: number
  z0: number
  z1: number
  width: number
  name: string
  tram: boolean
}

export const GRID_ANGLE = 0.09

type Segment = { a: Point; b: Point; name: string; width: number; tram: boolean }

const TRAM_NAMES = new Set([
  'Swanston Street',
  'Bourke Street',
  'Collins Street',
  'Flinders Street',
  'St Kilda Road',
  'Spring Street',
  'Nicholson Street',
])

const E_W: { v: number; name: string; width: number }[] = [
  { v: 1.75, name: 'Flinders Street', width: 0.3 },
  { v: 1.0, name: 'Collins Street', width: 0.3 },
  { v: 0.2, name: 'Bourke Street', width: 0.3 },
  { v: -0.7, name: 'Lonsdale Street', width: 0.28 },
  { v: -1.6, name: 'La Trobe Street', width: 0.28 },
  { v: -2.35, name: 'Victoria Street', width: 0.26 },
  { v: -3.1, name: 'Queensberry Street', width: 0.24 },
  { v: -3.85, name: 'Grattan Street', width: 0.24 },
  { v: -4.6, name: 'Elgin Street', width: 0.21 },
  { v: -5.35, name: 'Faraday Street', width: 0.2 },
  { v: -6.1, name: 'Princes Street', width: 0.2 },
  { v: 4.25, name: 'City Road', width: 0.26 },
  { v: 5.0, name: 'Clarendon Street', width: 0.24 },
  { v: 5.75, name: 'Coventry Street', width: 0.23 },
  { v: 6.5, name: 'Park Street', width: 0.21 },
  { v: 7.25, name: 'Grant Street', width: 0.2 },
]

const N_S: { u: number; name: string; width: number }[] = [
  { u: -6.75, name: 'Harbour Esplanade', width: 0.25 },
  { u: -5.85, name: 'Wurundjeri Way', width: 0.28 },
  { u: -4.95, name: 'Spencer Street', width: 0.3 },
  { u: -4.05, name: 'King Street', width: 0.28 },
  { u: -3.15, name: 'William Street', width: 0.28 },
  { u: -2.25, name: 'Queen Street', width: 0.28 },
  { u: -1.35, name: 'Elizabeth Street', width: 0.28 },
  { u: -0.45, name: 'Swanston Street', width: 0.34 },
  { u: 0.45, name: 'Russell Street', width: 0.26 },
  { u: 1.35, name: 'Exhibition Street', width: 0.26 },
  { u: 2.25, name: 'Spring Street', width: 0.3 },
  { u: 3.15, name: 'Nicholson Street', width: 0.26 },
  { u: 4.05, name: 'Rathdowne Street', width: 0.22 },
  { u: 4.95, name: 'Drummond Street', width: 0.22 },
  { u: 5.85, name: 'Lygon Street', width: 0.26 },
  { u: 6.75, name: 'Canning Street', width: 0.2 },
  { u: 7.65, name: 'Powlett Street', width: 0.22 },
  { u: 8.55, name: 'Gisborne Street', width: 0.2 },
  { u: 9.45, name: 'Hotham Street', width: 0.2 },
]

export function planCity(
  reserved: Footprint[],
  inside: (x: number, z: number) => boolean = insideLand,
) {
  const margin = 0.15
  const obstacles = reserved.map((r) => ({ ...r, height: 0 }))
  const blocked = (p: Point) =>
    obstacles.some(
      (b) =>
        Math.abs(p[0] - b.x) < b.w / 2 + margin - 1e-3 &&
        Math.abs(p[1] - b.z) < b.d / 2 + margin - 1e-3,
    )
  const insideRoad = (x: number, z: number) => inside(x, z) && !blocked([x, z])
  const clear = (a: Point, b: Point) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.035))
    for (let i = 0; i <= n; i++) {
      const p: Point = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]
      if (!insideRoad(p[0], p[1])) return false
    }
    return true
  }
  const corners: Point[] = obstacles
    .flatMap((b) =>
      [-1, 1].flatMap((s) =>
        [-1, 1].map(
          (t) =>
            [b.x + s * (b.w / 2 + margin + 0.01), b.z + t * (b.d / 2 + margin + 0.01)] as Point,
        ),
      ),
    )
    .filter((p) => !blocked(p) && inside(p[0], p[1]))
  const snap = (p: Point): Point => {
    if (!blocked(p) || !corners.length) return p
    return corners.reduce((a, b) =>
      Math.hypot(a[0] - p[0], a[1] - p[1]) < Math.hypot(b[0] - p[0], b[1] - p[1]) ? a : b,
    )
  }

  const segments: Segment[] = []
  const route = (a: Point, b: Point, name: string, width: number, tram = false) => {
    a = snap(a)
    b = snap(b)
    if (clear(a, b)) {
      segments.push({ a, b, name, width, tram })
      return
    }
    const points = [a, b, ...corners],
      dist = points.map(() => Infinity),
      prev = points.map(() => -1),
      done = new Set<number>()
    dist[0] = 0
    for (let k = 0; k < points.length; k++) {
      let u = -1
      points.forEach((_, i) => {
        if (!done.has(i) && (u < 0 || dist[i] < dist[u])) u = i
      })
      if (u < 0 || !Number.isFinite(dist[u])) break
      if (u === 1) break
      done.add(u)
      for (let v = 0; v < points.length; v++) {
        const d = dist[u] + Math.hypot(points[v][0] - points[u][0], points[v][1] - points[u][1])
        if (d < dist[v] && clear(points[u], points[v])) {
          dist[v] = d
          prev[v] = u
        }
      }
    }
    if (prev[1] < 0) return
    let v = 1
    while (prev[v] >= 0) {
      const u = prev[v]
      segments.push({ a: points[u], b: points[v], name, width, tram })
      v = u
    }
  }

  const cos = Math.cos(GRID_ANGLE),
    sin = Math.sin(GRID_ANGLE)
  const world = (u: number, v: number): Point => [u * cos - v * sin, u * sin + v * cos]

  const runs = (fixed: number, alongU: boolean) => {
    const out: Point[][] = []
    const point = (t: number): Point => (alongU ? world(t, fixed) : world(fixed, t))
    let current: Point[] = []
    const flush = () => {
      if (current.length > 1) out.push(current)
      current = []
    }
    for (let t = -14; t <= 14; t += 0.34) {
      const p = point(t)
      if (insideRoad(p[0], p[1])) current.push(p)
      else flush()
    }
    flush()
    return out
  }

  for (const line of E_W) {
    for (const run of runs(line.v, true)) {
      for (let k = 1; k < run.length; k++) {
        route(run[k - 1], run[k], line.name, line.width, TRAM_NAMES.has(line.name))
      }
    }
  }
  for (const line of N_S) {
    for (const run of runs(line.u, false)) {
      for (let k = 1; k < run.length; k++) {
        route(run[k - 1], run[k], line.name, line.width, TRAM_NAMES.has(line.name))
      }
    }
  }

  // The diagonal that leaves Princes Bridge and the parkland boulevards.
  const extras: { points: Point[]; name: string; width: number; tram?: boolean }[] = [
    {
      points: [
        [-0.45, 3.66],
        [-0.1, 4.4],
        [0.55, 5.45],
        [1.35, 6.6],
        [1.95, 7.8],
        [2.35, 8.75],
      ],
      name: 'St Kilda Road',
      width: 0.32,
      tram: true,
    },
    {
      points: [
        [3.2, -6.5],
        [3.05, -5.4],
        [2.9, -4.3],
        [2.7, -3.2],
        [2.5, -2.2],
      ],
      name: 'Royal Parade',
      width: 0.26,
    },
    {
      points: [
        [0.0, 5.6],
        [1.2, 5.72],
        [2.6, 5.82],
        [4.2, 5.9],
      ],
      name: 'Domain Road',
      width: 0.24,
    },
    {
      points: [
        [5.35, 5.72],
        [5.45, 6.6],
        [5.72, 7.65],
        [6.6, 8.25],
        [7.7, 8.15],
        [8.65, 7.55],
      ],
      name: 'Brunton Avenue',
      width: 0.24,
    },
    {
      points: [
        [2.2, 5.35],
        [2.2, 6.4],
        [2.2, 7.5],
      ],
      name: 'Birdwood Avenue',
      width: 0.22,
    },
  ]
  for (const extra of extras) {
    for (let i = 1; i < extra.points.length; i++) {
      route(extra.points[i - 1], extra.points[i], extra.name, extra.width, extra.tram)
    }
  }

  // Split every crossing and collinear endpoint, so traffic and geometry share one planar graph.
  const network: RoadNetwork = { nodes: [], edges: [] }
  const ids = new Map<string, number>()
  const node = (p: Point) => {
    const key = p.map((v) => v.toFixed(4)).join(',')
    if (ids.has(key)) return ids.get(key)!
    const id = network.nodes.length
    ids.set(key, id)
    network.nodes.push({ x: p[0], z: p[1], neighbors: [], signal: id % 2 })
    return id
  }
  const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0]
  const used = new Set<string>()
  for (const s of segments) {
    const dx = s.b[0] - s.a[0],
      dz = s.b[1] - s.a[1],
      len2 = dx * dx + dz * dz
    if (len2 < 1e-8) continue
    const ts = [0, 1]
    for (const o of segments) {
      const q: Point = [o.a[0] - s.a[0], o.a[1] - s.a[1]],
        v: Point = [o.b[0] - o.a[0], o.b[1] - o.a[1]],
        r: Point = [dx, dz],
        den = cross(r, v)
      if (Math.abs(den) > 1e-8) {
        const t = cross(q, v) / den,
          u = cross(q, r) / den
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) ts.push(t)
      } else {
        for (const p of [o.a, o.b]) {
          if (segmentDistance(p[0], p[1], s.a, s.b) < 1e-5) {
            const t = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dz) / len2
            if (t > 0 && t < 1) ts.push(t)
          }
        }
      }
    }
    ts.sort((a, b) => a - b)
    for (let i = 1; i < ts.length; i++) {
      if (ts[i] - ts[i - 1] < 1e-4) continue
      const a = node([s.a[0] + dx * ts[i - 1], s.a[1] + dz * ts[i - 1]]),
        b = node([s.a[0] + dx * ts[i], s.a[1] + dz * ts[i]]),
        key = [a, b].sort((x, y) => x - y).join(',')
      if (used.has(key)) continue
      used.add(key)
      network.edges.push({ a, b, name: s.name, width: s.width, tram: s.tram })
      network.nodes[a].neighbors.push(b)
      network.nodes[b].neighbors.push(a)
    }
  }

  // Bridges: a deck edge over the water plus short approaches to the nearest grid node on each bank.
  const bridgePlans: BridgePlan[] = []
  const addEdge = (a: number, b: number, name: string, width: number, bridge = false, tram = false) => {
    if (a === b) return
    const key = [a, b].sort((x, y) => x - y).join(',')
    if (used.has(key)) return
    used.add(key)
    network.edges.push({ a, b, name, width, bridge, tram })
    network.nodes[a].neighbors.push(b)
    network.nodes[b].neighbors.push(a)
  }
  for (const bridge of BRIDGES) {
    const z0 = northBank(bridge.x) - 0.07,
      z1 = southBank(bridge.x) + 0.07
    const north = node([bridge.x, z0]),
      south = node([bridge.x, z1])
    bridgePlans.push({ id: bridge.id, x: bridge.x, z0, z1, width: bridge.width, name: bridge.name, tram: bridge.tram })
    addEdge(north, south, bridge.name, bridge.width, true, bridge.tram)
    for (const [endpoint, side] of [
      [north, 'north'],
      [south, 'south'],
    ] as [number, string][]) {
      let best = -1,
        bestD = Infinity
      for (let i = 0; i < network.nodes.length; i++) {
        if (i === endpoint || i === north || i === south) continue
        const n = network.nodes[i]
        if (side === 'north' ? n.z > z0 + 0.55 : n.z < z1 - 0.55) continue
        const d = Math.hypot(n.x - bridge.x, n.z - (side === 'north' ? z0 : z1))
        if (d < bestD) {
          bestD = d
          best = i
        }
      }
      if (best >= 0 && bestD < 2.2) addEdge(endpoint, best, `${bridge.name} approach`, 0.24, false, bridge.tram)
    }
  }

  // Components: connect close land components, then drop tiny stubs. Every bank has a bridge.
  for (let pass = 0; pass < 18; pass++) {
    const components = networkComponents(network)
    if (components.length <= 1) break
    const main = new Set(components[0])
    let best: { a: number; b: number; d: number } | null = null
    for (const component of components.slice(1)) {
      for (const a of component) {
        for (const b of main) {
          const A = network.nodes[a],
            B = network.nodes[b],
            d = Math.hypot(A.x - B.x, A.z - B.z)
          if (d > 1.4 || (best && d >= best.d)) continue
          if (!clear([A.x, A.z], [B.x, B.z])) continue
          best = { a, b, d }
        }
      }
    }
    if (!best) break
    addEdge(best.a, best.b, 'Little Street', 0.18)
  }
  pruneTinyComponents(network, 20)

  const blocks = extractBlocks(network)
  const parcels = placeParcels(network, obstacles, inside)
  return { network, blocks, parcels, bridges: bridgePlans }
}

export function networkComponents(network: RoadNetwork): number[][] {
  const adjacency: number[][] = network.nodes.map(() => [])
  network.edges.forEach((e) => {
    adjacency[e.a].push(e.b)
    adjacency[e.b].push(e.a)
  })
  const seen = new Set<number>()
  const components: number[][] = []
  for (let start = 0; start < network.nodes.length; start++) {
    if (seen.has(start)) continue
    const component = [start]
    seen.add(start)
    for (let i = 0; i < component.length; i++) {
      for (const next of adjacency[component[i]]) {
        if (!seen.has(next)) {
          seen.add(next)
          component.push(next)
        }
      }
    }
    components.push(component)
  }
  components.sort((a, b) => b.length - a.length)
  return components
}

function pruneTinyComponents(network: RoadNetwork, minimum: number) {
  let components = networkComponents(network)
  while (components.length && components[components.length - 1].length < minimum) {
    const drop = new Set(components[components.length - 1])
    const remap = new Map<number, number>()
    const keep = network.nodes.map((_, i) => i).filter((i) => !drop.has(i))
    keep.forEach((id, i) => remap.set(id, i))
    network.nodes = keep.map((id) => network.nodes[id])
    network.edges = network.edges
      .filter((e) => !drop.has(e.a) && !drop.has(e.b))
      .map((e) => ({ ...e, a: remap.get(e.a)!, b: remap.get(e.b)! }))
    network.nodes.forEach((n) => (n.neighbors = []))
    network.edges.forEach((e) => {
      network.nodes[e.a].neighbors.push(e.b)
      network.nodes[e.b].neighbors.push(e.a)
    })
    components = networkComponents(network)
  }
}

function extractBlocks(network: RoadNetwork): CityBlock[] {
  const blocks: CityBlock[] = []
  const visited = new Set<string>()
  for (let a = 0; a < network.nodes.length; a++) {
    for (const b of network.nodes[a].neighbors) {
      if (visited.has(`${a},${b}`)) continue
      const boundary: Point[] = []
      let u = a,
        v = b
      for (let k = 0; k < network.edges.length * 2; k++) {
        const key = `${u},${v}`
        if (visited.has(key)) break
        visited.add(key)
        const n = network.nodes[u]
        boundary.push([n.x, n.z])
        const at = network.nodes[v]
        const sorted = [...at.neighbors].sort(
          (i, j) =>
            Math.atan2(network.nodes[i].z - at.z, network.nodes[i].x - at.x) -
            Math.atan2(network.nodes[j].z - at.z, network.nodes[j].x - at.x),
        )
        const next = sorted[(sorted.indexOf(u) - 1 + sorted.length) % sorted.length]
        u = v
        v = next
        if (u === a && v === b) break
      }
      const area = Math.abs(
        boundary.reduce((sum, p, i) => {
          const q = boundary[(i + 1) % boundary.length]
          return sum + p[0] * q[1] - q[0] * p[1]
        }, 0) / 2,
      )
      if (area > 0.02 && boundary.length >= 3) {
        const cx = boundary.reduce((s, p) => s + p[0], 0) / boundary.length
        const cz = boundary.reduce((s, p) => s + p[1], 0) / boundary.length
        blocks.push({ boundary, district: districtAt(cx, cz) })
      }
    }
  }
  return blocks
}

export type PlanResult = ReturnType<typeof planCity>
export type { Point }

function placeParcels(
  network: RoadNetwork,
  obstacles: Footprint[],
  inside: (x: number, z: number) => boolean,
): BuildingParcel[] {
  const parcels: BuildingParcel[] = []
  const rot = GRID_ANGLE,
    cr = Math.cos(rot),
    sr = Math.sin(rot)
  const bw = 0.36,
    bd = 0.32,
    pu = 0.48,
    pv = 0.44
  const aabbW = bw * (Math.abs(cr) + Math.abs(sr)) + 0.06,
    aabbD = bd * (Math.abs(cr) + Math.abs(sr)) + 0.06
  for (let v = -8.6; v <= 8.6; v += pv) {
    for (let u = -13.2; u <= 13.2; u += pu) {
      const x = u * cr - v * sr,
        z = u * sr + v * cr
      if (!inside(x, z)) continue
      const corners: Point[] = [
        [x + (-bw / 2) * cr - (-bd / 2) * sr, z + (-bw / 2) * sr + (-bd / 2) * cr],
        [x + (bw / 2) * cr - (-bd / 2) * sr, z + (bw / 2) * sr + (-bd / 2) * cr],
        [x + (bw / 2) * cr - (bd / 2) * sr, z + (bw / 2) * sr + (bd / 2) * cr],
        [x + (-bw / 2) * cr - (bd / 2) * sr, z + (-bw / 2) * sr + (bd / 2) * cr],
      ]
      if (!corners.every(([px, pz]) => inside(px, pz))) continue
      if (
        obstacles.some(
          (b) =>
            Math.abs(x - b.x) < (aabbW + b.w) / 2 + 0.02 &&
            Math.abs(z - b.z) < (aabbD + b.d) / 2 + 0.02,
        )
      )
        continue
      let blockedRoad = false
      for (const edge of network.edges) {
        const A = network.nodes[edge.a],
          B = network.nodes[edge.b],
          dx = B.x - A.x,
          dz = B.z - A.z,
          len = Math.hypot(dx, dz)
        if (!len) continue
        const nu = Math.abs((-dz * cr - dx * sr) / len),
          nv = Math.abs((-dz * sr + dx * cr) / len)
        const reach = (nu * bw + nv * bd) / 2 + edge.width / 2 + 0.025
        if (segmentDistance(x, z, [A.x, A.z], [B.x, B.z]) < reach) {
          blockedRoad = true
          break
        }
      }
      if (blockedRoad) continue
      parcels.push({
        x,
        z,
        w: bw,
        d: bd,
        height: 0,
        rot,
        district: districtAt(x, z),
        blockId: -1,
      })
    }
  }
  return parcels
}

export function inBlock(x: number, z: number, block: CityBlock) {
  return inPolygon(x, z, block.boundary)
}

/** Shared traffic-light phase: the same function drives the signal bulbs and the stopping cars. */
export function greenFor(node: RoadNode, vertical: boolean, time: number) {
  const phase = (time + node.signal * 1.3) % 12
  return vertical ? phase < 5.2 : phase >= 6 && phase < 11.2
}
