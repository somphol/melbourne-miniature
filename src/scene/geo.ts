// Melbourne's compressed geography: the Yarra channel, the two banks, the bay wedge,
// the Hoddle Grid districts and the reserved landmark / park footprints.

export type Point = [number, number]

export const TRAY = { w: 24.4, d: 18.4, r: 1.55 } as const

/** River centreline, west (bay mouth) to east. `half` is the half width of the channel. */
export const RIVER = [
  { x: -12.2, z: 5.75, half: 1.55 },
  { x: -10.4, z: 5.28, half: 1.25 },
  { x: -8.6, z: 4.78, half: 1.05 },
  { x: -6.8, z: 4.28, half: 0.90 },
  { x: -5.0, z: 3.93, half: 0.82 },
  { x: -3.2, z: 3.69, half: 0.76 },
  { x: -1.4, z: 3.53, half: 0.72 },
  { x: 0.4, z: 3.50, half: 0.70 },
  { x: 2.2, z: 3.61, half: 0.72 },
  { x: 4.0, z: 4.02, half: 0.75 },
  { x: 5.8, z: 4.75, half: 0.79 },
  { x: 7.4, z: 5.55, half: 0.84 },
  { x: 9.2, z: 6.16, half: 0.92 },
  { x: 10.8, z: 6.05, half: 0.97 },
  { x: 12.2, z: 5.86, half: 1.04 },
] as const

export function riverAt(x: number) {
  if (x <= RIVER[0].x) return { z: RIVER[0].z, half: RIVER[0].half }
  const last = RIVER[RIVER.length - 1]
  if (x >= last.x) return { z: last.z, half: last.half }
  for (let i = 1; i < RIVER.length; i++) {
    const a = RIVER[i - 1],
      b = RIVER[i]
    if (x <= b.x) {
      const t = (x - a.x) / (b.x - a.x)
      return { z: a.z + (b.z - a.z) * t, half: a.half + (b.half - a.half) * t }
    }
  }
  return { z: last.z, half: last.half }
}

export const northBank = (x: number) => riverAt(x).z - riverAt(x).half
export const southBank = (x: number) => riverAt(x).z + riverAt(x).half

function bankLine(x0: number, x1: number, which: 'north' | 'south', step = 0.4): Point[] {
  const out: Point[] = []
  const dir = x1 >= x0 ? 1 : -1
  for (let x = x0; dir > 0 ? x <= x1 + 1e-6 : x >= x1 - 1e-6; x += dir * step) {
    out.push([x, which === 'north' ? northBank(x) : southBank(x)])
  }
  return out
}

/** North bank land: Docklands, the Hoddle Grid, Carlton, East Melbourne. */
export const NORTH_LAND: Point[] = (() => {
  const bank = bankLine(12.2, -12.2, 'north')
  return [
    [-10.9, -9.2],
    [12.2, -9.2],
    [12.2, northBank(12.2)],
    ...bank,
    [-12.2, -7.6],
  ]
})()

/** South bank land: Southbank, the Domain, Yarra Park and the bay-side strip. */
export const SOUTH_LAND: Point[] = (() => {
  const bank = bankLine(12.2, -12.2, 'south')
  return [
    [12.2, southBank(12.2)],
    ...bank,
    [-12.2, southBank(-12.2)],
    [-10.9, 7.34],
    [-9.3, 7.82],
    [-7.7, 8.48],
    [-6.2, 9.2],
    [10.9, 9.2],
    [12.2, 7.65],
  ]
})()

export function inPolygon(x: number, z: number, polygon: Point[]) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j]
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) {
      inside = !inside
    }
  }
  return inside
}

export function insideLand(x: number, z: number) {
  return inPolygon(x, z, NORTH_LAND) || inPolygon(x, z, SOUTH_LAND)
}

export function insideTray(x: number, z: number) {
  const r = TRAY.r,
    qx = Math.abs(x) - (TRAY.w / 2 - r),
    qz = Math.abs(z) - (TRAY.d / 2 - r)
  if (qx > 0 && qz > 0) return qx * qx + qz * qz <= r * r
  return Math.abs(x) <= TRAY.w / 2 && Math.abs(z) <= TRAY.d / 2
}

export const inWater = (x: number, z: number) => insideTray(x, z) && !insideLand(x, z)

export function segmentDistance(x: number, z: number, a: Point, b: Point) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    len2 = dx * dx + dz * dz
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2))
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz)
}

/** Rounded-rectangle outline used by the tray, the rim and the water surface. */
export function roundedRectPoints(w: number, d: number, r: number, segments = 8): Point[] {
  const pts: Point[] = []
  const corner = (cx: number, cz: number, start: number) => {
    for (let i = 0; i <= segments; i++) {
      const a = start + (i / segments) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
    }
  }
  corner(w / 2 - r, -d / 2 + r, -Math.PI / 2)
  corner(w / 2 - r, d / 2 - r, 0)
  corner(-w / 2 + r, d / 2 - r, Math.PI / 2)
  corner(-w / 2 + r, -d / 2 + r, Math.PI)
  return pts
}

export type LandmarkId =
  | 'flinders'
  | 'fed-square'
  | 'eureka'
  | 'arts-centre'
  | 'exhibition'
  | 'mcg'
  | 'st-pauls'
  | 'shrine'

export interface LandmarkSite {
  id: LandmarkId
  x: number
  z: number
  w: number
  d: number
  look: number
  /** Camera offset in world axes from the look point. */
  offset: [number, number, number]
}

export const LANDMARKS: LandmarkSite[] = [
  { id: 'flinders', x: -1.55, z: 2.35, w: 1.9, d: 0.72, look: 1.1, offset: [3.55, 3.4, -3.85] },
  { id: 'fed-square', x: 0.75, z: 2.4, w: 1.5, d: 0.8, look: 0.8, offset: [2.4, 1.8, -2.4] },
  { id: 'eureka', x: -1.0, z: 4.85, w: 0.9, d: 0.9, look: 2.9, offset: [5.8, 4.6, 4.6] },
  { id: 'arts-centre', x: -2.3, z: 4.9, w: 1.1, d: 1.0, look: 2.4, offset: [-2.8, 4.2, 6.4] },
  { id: 'exhibition', x: 3.2, z: -3.6, w: 2.6, d: 1.5, look: 1.55, offset: [5.2, 3.2, 4.4] },
  { id: 'mcg', x: 7.0, z: 7.45, w: 2.8, d: 2.4, look: 0.9, offset: [5.8, 3.6, -4.8] },
  { id: 'st-pauls', x: 0.5, z: 0.9, w: 0.9, d: 0.8, look: 1.65, offset: [3.3, 2.6, -3.5] },
  { id: 'shrine', x: 2.2, z: 6.0, w: 1.5, d: 1.5, look: 1.1, offset: [4.5, 3.1, -4.2] },
]

export interface ParkSite {
  id: string
  x: number
  z: number
  w: number
  d: number
  kind: 'garden' | 'lawn' | 'trees'
}

export const PARKS: ParkSite[] = [
  { id: 'carlton', x: 3.2, z: -3.6, w: 3.0, d: 2.0, kind: 'garden' },
  { id: 'fitzroy', x: 3.6, z: 1.2, w: 1.4, d: 1.6, kind: 'garden' },
  { id: 'treasury', x: 2.0, z: 0.6, w: 1.0, d: 0.9, kind: 'garden' },
  { id: 'flagstaff', x: -1.8, z: -0.9, w: 1.0, d: 0.7, kind: 'lawn' },
  { id: 'botanic', x: 0.6, z: 7.7, w: 3.2, d: 1.2, kind: 'garden' },
  { id: 'yarra', x: 7.0, z: 7.35, w: 3.2, d: 2.6, kind: 'trees' },
]

export const RESERVED = [
  ...LANDMARKS.map((l) => ({ ...l, height: 0 })),
  ...PARKS.map((p) => ({ ...p, height: 0 })),
]

export function footprintOf(site: { x: number; z: number; w: number; d: number }) {
  return { x: site.x, z: site.z, w: site.w, d: site.d, height: 0 }
}

export function districtAt(x: number, z: number) {
  if (x < -4.6) return z > -1.0 ? 'Docklands' : 'North Melbourne'
  if (x >= 2.8 && z < -1.4) return 'Carlton'
  if (x >= 2.8 && z < 5.2) return 'East Melbourne'
  if (z >= 3.1 && x >= 2.8) return 'Domain'
  if (z >= 3.1) return 'Southbank'
  if (x > -3.2) return 'Hoddle Grid'
  return 'Docklands'
}

export const BRIDGES = [
  { id: 'princes', x: -0.45, width: 0.34, name: 'Princes Bridge', tram: true },
  { id: 'queens', x: -3.4, width: 0.3, name: 'Queens Bridge', tram: false },
  { id: 'spencer', x: -5.3, width: 0.3, name: 'Spencer Street Bridge', tram: false },
] as const

export function bridgeSpan(bridge: (typeof BRIDGES)[number]) {
  return { z0: northBank(bridge.x), z1: southBank(bridge.x) }
}

/** A few named starting views for debugging (?view=…). Capture mode ignores them. */
export const DEBUG_VIEWS: Record<string, { position: [number, number, number]; target: [number, number, number] }> = {
  overview: { position: [23, 17, 23], target: [0, 1.2, 0.8] },
  river: { position: [6, 6.5, 11], target: [-1, 1.4, 3.6] },
  cbd: { position: [7, 6, 8], target: [-0.4, 1.4, 1.0] },
  southbank: { position: [5, 5.5, 11], target: [-1.2, 2.2, 4.6] },
  mcg: { position: [12, 6, 8], target: [7, 1.1, 7] },
  exhibition: { position: [8, 6, 2], target: [3.2, 1.5, -3.6] },
}
