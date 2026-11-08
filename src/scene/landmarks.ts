import * as THREE from 'three'
import { Kit, clipped, frustum, gable, loft, rect, type Kind } from './kit'
import type { LandmarkId, Point } from './geo'

const CREAM = '#e8d9ad'
const TRIM = '#f3ead2'
const BLUESTONE = '#5c686d'
const GREEN = '#5b7d68'
const GOLD = '#c9a24a'

const shift = (points: Point[], x: number, z: number): Point[] =>
  points.map(([px, pz]) => [px + x, pz + z] as Point)

/** Long cream railway station with a corner dome and four clocks. */
export function flinders(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0.018)
  k.solid(rect(2.15, 0.7), 0, 0.1, '#cbbd9e')
  k.solid(rect(2.1, 0.64), 0.1, 0.58, CREAM)
  k.windows(rect(2.1, 0.64), 0.2, 0.4, 'historic', 0.18, 0.2)
  k.band(rect(2.12, 0.66), 0.1, 0.03, 0.03, TRIM)
  k.band(rect(2.12, 0.66), 0.66, 0.04, 0.04, TRIM)
  gable(k, 2.16, 0.68, 0.66, 0.26, GREEN, 0, 0)
  // Arcade: tall arched openings along the river face.
  for (let i = 0; i < 11; i++) {
    const px = -0.94 + i * 0.188
    k.box(px, 0.3, 0.328, 0.1, 0.3, 0.016, '#4e6d72', 'glass')
    k.box(px, 0.47, 0.328, 0.13, 0.03, 0.018, TRIM)
    k.box(px, 0.32, 0.34, 0.125, 0.02, 0.012, TRIM)
  }
  // Corner tower and dome at the Swanston Street end.
  const towerX = 0.64
  k.solid(shift(rect(0.38, 0.38), towerX, 0), 0.1, 1.1, CREAM)
  k.windows(shift(rect(0.38, 0.38), towerX, 0), 0.5, 0.5, 'deco', 0.12, 0.22)
  k.band(shift(rect(0.4, 0.4), towerX, 0), 1.2, 0.035, 0.045, TRIM)
  k.cylinder(towerX, 1.28, 0, 0.2, 0.1, TRIM, 'stone', 0.2, 12)
  const dome = new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  dome.scale(1, 1.05, 1)
  k.geometry(dome, GREEN, 'roof', towerX, 1.33, 0)
  k.cylinder(towerX, 1.55, 0, 0.05, 0.14, '#d9d2b9', 'stone', 0.04, 10)
  k.cylinder(towerX, 1.65, 0, 0.012, 0.18, '#c6c9b6', 'metal', 0.004, 6)
  // Clock faces under the dome.
  for (const [cx, cz, yaw] of [
    [towerX, 0.196, 0],
    [towerX, -0.196, 0],
    [towerX + 0.196, 0, Math.PI / 2],
    [towerX - 0.196, 0, Math.PI / 2],
  ] as [number, number, number][]) {
    k.box(cx, 1.13, cz, 0.18, 0.18, 0.014, '#f7f2e2', 'stone', yaw)
    k.box(cx, 1.13, cz + (yaw ? -0.009 : 0.009), 0.16, 0.16, 0.007, '#e7dcc4', 'stone', yaw)
    k.box(cx, 1.13, cz + (yaw ? -0.012 : 0.012), 0.012, 0.1, 0.006, '#3d4a48', 'metal', yaw)
    k.box(cx + 0.035, 1.13, cz + (yaw ? -0.012 : 0.012), 0.07, 0.012, 0.006, '#3d4a48', 'metal', yaw)
  }
  k.band(shift(rect(0.42, 0.42), towerX, 0), 1.3, 0.03, 0.02, '#bfb49a')
  // Station name board and a flag.
  k.box(-0.2, 0.7, 0.36, 0.8, 0.07, 0.02, '#3f5f58', 'stone')
  k.box(-0.2, 0.7, 0.372, 0.58, 0.025, 0.008, '#f0e5c9', 'metal')
  k.box(-0.2, 0.7, -0.36, 0.8, 0.07, 0.02, '#3f5f58', 'stone')
  k.box(-0.2, 0.7, -0.372, 0.58, 0.025, 0.008, '#f0e5c9', 'metal')
  k.cylinder(towerX, 1.7, 0, 0.018, 0.12, GOLD, 'accent', 0.008, 6)
  k.box(0.94, 0.9, 0, 0.02, 0.5, 0.02, '#b9b6a3', 'metal')
  k.box(0.94, 1.12, 0.08, 0.02, 0.18, 0.16, '#b65343', 'stone')
  k.count('Flinders Street Station')
}

/** Angular zinc and ochre shards around a paved plaza. */
export function fedSquare(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, -0.06)
  k.box(0, 0.015, 0, 1.5, 0.03, 0.8, '#9d9a8e')
  for (let i = 0; i < 9; i++) k.box(-0.6 + i * 0.15, 0.032, 0.24, 0.14, 0.006, 0.28, '#b7b3a4')
  const shards = [
    { x: -0.44, z: -0.04, w: 0.48, d: 0.42, h: 1.0, top: 0.4, ox: 0.16, oz: 0.03, color: '#656a64', kind: 'stone' as const },
    { x: 0.02, z: 0.12, w: 0.4, d: 0.34, h: 1.02, top: 0.3, ox: -0.12, oz: -0.06, color: '#a46345', kind: 'stone' as const },
    { x: 0.46, z: -0.05, w: 0.38, d: 0.34, h: 0.72, top: 0.38, ox: -0.09, oz: 0.09, color: '#7f9c9a', kind: 'glass' as const },
  ]
  for (const shard of shards) {
    const lower = rect(shard.w, shard.d)
    const upper = rect(shard.w * shard.top, shard.d * shard.top).map(
      ([px, pz]) => [px + shard.ox, pz + shard.oz] as Point,
    )
    loft(k, lower, upper, 0.03, shard.h, shard.color, shard.kind)
    k.band(lower, 0.03 + shard.h * 0.52, 0.018, 0.022, '#d8d2bd')
    for (const s of [-1, 1]) {
      k.box(shard.x + s * shard.w * 0.42, 0.03 + shard.h * 0.5, shard.z + shard.d / 2, 0.022, shard.h * 0.8, 0.022, '#c3bca6', 'metal')
    }
    k.box(shard.x + shard.ox * 0.8, 0.03 + shard.h + 0.02, shard.z + shard.oz * 0.8, shard.w * shard.top * 0.84, 0.025, shard.d * shard.top * 0.84, '#c6d1c8', 'glass')
    // Sloped cap: a thin, tilted plane over the shard.
    const cap = new THREE.BoxGeometry(shard.w * shard.top * 0.9, 0.012, shard.d * shard.top * 0.9)
    cap.rotateX(0.18)
    cap.rotateZ(-0.12)
    k.geometry(cap, shard.kind === 'glass' ? '#a9c3bd' : '#8c8b7c', 'metal', shard.x + shard.ox * 0.8, 0.03 + shard.h + 0.03, shard.z + shard.oz * 0.8)
  }
  // Ochre entry portal, the glass atrium wall and the civic mast.
  k.solid(rect(0.34, 0.1), 0.03, 0.38, '#a46345')
  k.box(0, 0.23, 0.06, 0.24, 0.3, 0.02, '#6c8b91', 'glass')
  k.box(0, 0.2, -0.37, 0.92, 0.4, 0.02, '#7d9a99', 'glass')
  for (let i = 0; i < 6; i++) k.box(-0.38 + i * 0.15, 0.2, -0.385, 0.018, 0.4, 0.018, '#5a6f6d', 'metal')
  k.box(0, 0.41, -0.37, 0.96, 0.025, 0.03, '#d8d2bd', 'metal')
  k.cylinder(-0.7, 0.7, 0.33, 0.012, 1.0, '#c9c7b5', 'metal', 0.006, 6)
  k.box(-0.7, 0.95, 0.33, 0.18, 0.1, 0.012, '#d7a24e', 'stone')
  for (let i = 0; i < 3; i++) {
    k.cylinder(-0.82 + i * 0.12, 0.4, -0.34, 0.008, 0.62, '#b8b5a5', 'metal', 0.006, 5)
    k.box(-0.82 + i * 0.12 + 0.04, 0.62, -0.34, 0.08, 0.06, 0.012, ['#d7a24e', '#c9604e', '#6b8e8a'][i], 'stone')
  }
  k.count('Federation Square')
}

/** Eureka Tower: a slender blue-grey shaft under a gold crown. */
export function eureka(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0.08)
  k.solid(rect(0.86, 0.82), 0, 0.16, '#b8b7a8')
  k.band(rect(0.86, 0.82), 0.16, 0.03, 0.03, '#ded9c6')
  k.solid(rect(0.72, 0.68), 0.16, 3.22, '#6f8f9b', 'glass')
  for (let y = 0.3; y < 3.34; y += 0.14) k.band(rect(0.72, 0.68), y, 0.008, 0.011, '#b8cdd0', 'metal')
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) k.box((sx * 0.72) / 2, 1.75, (sz * 0.68) / 2, 0.014, 3.2, 0.014, '#d0dedb', 'metal')
  }
  // White vertical stripe on the west face, the tower's identifying line.
  k.box(-0.358, 1.75, 0, 0.012, 3.2, 0.1, '#eef1e8', 'metal')
  // Gold crown and the stepped observation deck.
  k.solid(rect(0.72, 0.68), 3.38, 0.4, GOLD, 'accent')
  for (let y = 3.42; y < 3.74; y += 0.08) k.band(rect(0.72, 0.68), y, 0.006, 0.01, '#f0d589', 'accent')
  k.solid(rect(0.56, 0.54), 3.78, 0.14, '#cfc8b3')
  k.solid(rect(0.36, 0.34), 3.92, 0.1, '#dcd6c2')
  k.cylinder(0, 4.12, 0, 0.012, 0.42, '#d4d9cc', 'metal', 0.004, 6)
  k.box(0, 3.3, 0.348, 0.5, 0.06, 0.02, '#f0ead8', 'stone')
  k.box(0, 3.3, 0.36, 0.34, 0.022, 0.006, '#5e6f6b', 'metal')
  k.count('Eureka Tower')
}

/** The Arts Centre's open golden lattice spire over a low theatre drum. */
export function artsCentre(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0)
  // Theatre base with a curved copper roof.
  k.cylinder(0, 0.16, 0, 0.44, 0.32, '#d9d2bd', 'stone', 0.42, 16)
  k.cylinder(0, 0.33, 0, 0.43, 0.03, '#b9ae95', 'stone', 0.4, 16)
  const roof = new THREE.SphereGeometry(0.43, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)
  roof.scale(1, 0.36, 1)
  k.geometry(roof, '#8a6f4a', 'copper', 0, 0.34, 0)
  k.solid(rect(0.24, 0.24), 0.36, 0.16, '#c6bea7')
  // Open lattice: eight legs, six rings and a slender central mast.
  const baseY = 0.5,
    apexY = 3.65,
    legs = 8
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2,
      bx = Math.cos(a) * 0.27,
      bz = Math.sin(a) * 0.27
    k.beam(new THREE.Vector3(bx, baseY, bz), new THREE.Vector3(0, apexY, 0), 0.012, GOLD, 'accent')
    if (i % 2 === 0) {
      k.beam(new THREE.Vector3(bx, baseY, bz), new THREE.Vector3(Math.cos(a + 0.4) * 0.27, baseY, Math.sin(a + 0.4) * 0.27), 0.006, '#b8913f', 'accent')
    }
  }
  for (let r = 0; r < 6; r++) {
    const t = r / 6,
      y = baseY + (apexY - baseY) * t,
      radius = 0.27 * (1 - t) + 0.012
    for (let i = 0; i < legs; i++) {
      const a = (i / legs) * Math.PI * 2,
        b = ((i + 1) / legs) * Math.PI * 2
      k.beam(
        new THREE.Vector3(Math.cos(a) * radius, y, Math.sin(a) * radius),
        new THREE.Vector3(Math.cos(b) * radius, y, Math.sin(b) * radius),
        0.006,
        GOLD,
        'accent',
      )
    }
  }
  k.cylinder(0, (baseY + apexY) / 2, 0, 0.012, apexY - baseY, '#d3ad54', 'accent', 0.006, 6)
  k.cylinder(0, apexY + 0.09, 0, 0.022, 0.18, GOLD, 'accent', 0.014, 8)
  k.box(0, 0.47, 0.22, 0.3, 0.06, 0.06, '#c9a24a', 'accent')
  k.count('Arts Centre Spire')
}

/** Royal Exhibition Building: long hall, green dome, colonnade and flagpoles. */
export function exhibition(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0.015)
  k.solid(rect(2.35, 1.15), 0, 0.1, '#d6c9a9')
  k.solid(rect(2.2, 1.0), 0.1, 0.72, CREAM)
  k.windows(rect(2.2, 1.0), 0.2, 0.5, 'historic', 0.2, 0.22)
  k.band(rect(2.22, 1.02), 0.1, 0.03, 0.035, TRIM)
  k.band(rect(2.22, 1.02), 0.8, 0.04, 0.04, TRIM)
  gable(k, 2.24, 1.02, 0.82, 0.3, '#61786a', 0, 0)
  // Side wings and their lower roofs.
  for (const s of [-1, 1]) {
    k.solid(rect(0.36, 0.7), 0.1, 0.46, CREAM)
    gable(k, 0.38, 0.72, 0.56, 0.16, '#61786a', s * 1.16, 0)
  }
  // Portico on the south face.
  for (let i = 0; i < 8; i++) {
    k.cylinder(-0.7 + i * 0.2, 0.48, 0.58, 0.038, 0.72, TRIM, 'stone', 0.032, 8)
  }
  k.box(0, 0.87, 0.58, 1.7, 0.08, 0.18, TRIM)
  gable(k, 1.58, 0.18, 0.91, 0.22, TRIM, 0, 0.58)
  // Central dome, drum and lantern.
  k.cylinder(0, 0.9, 0, 0.42, 0.26, CREAM, 'stone', 0.42, 20)
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    k.box(Math.cos(a) * 0.42, 0.9, Math.sin(a) * 0.42, 0.045, 0.26, 0.045, TRIM)
  }
  k.cylinder(0, 1.04, 0, 0.48, 0.05, TRIM, 'stone', 0.48, 20)
  const dome = new THREE.SphereGeometry(0.44, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)
  dome.scale(1, 0.95, 1)
  k.geometry(dome, '#6f8d78', 'roof', 0, 1.07, 0)
  k.cylinder(0, 1.5, 0, 0.09, 0.16, TRIM, 'stone', 0.07, 10)
  k.cylinder(0, 1.62, 0, 0.038, 0.1, GOLD, 'accent', 0.02, 8)
  k.cylinder(0, 1.72, 0, 0.01, 0.26, '#c9c9b5', 'metal', 0.004, 5)
  // Two flagpoles at the front.
  for (const s of [-1, 1]) {
    k.cylinder(s * 0.88, 0.78, 0.66, 0.01, 1.05, '#c9c6b3', 'metal', 0.006, 5)
    k.box(s * 0.88 + 0.05, 1.24, 0.66, 0.1, 0.07, 0.012, '#c9604e', 'stone')
  }
  k.count('Royal Exhibition Building')
}

/** MCG: an oval bowl, grass infield and four light towers. */
export function mcg(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0)
  // Grass oval.
  const grass = new THREE.CylinderGeometry(1, 1, 0.035, 36)
  grass.scale(1.16, 1, 0.88)
  k.geometry(grass, '#70994f', 'stone', 0, 0.06, 0)
  // Two seating rings.
  const ring = (rx: number, ry: number, ix: number, iy: number, y: number, h: number, color: string) => {
    const shape = new THREE.Shape()
    shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0)
    const hole = new THREE.Path()
    hole.absellipse(0, 0, ix, iy, 0, Math.PI * 2, true, 0)
    shape.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 32 })
    g.rotateX(-Math.PI / 2)
    k.geometry(g, color, 'stone', 0, y, 0)
  }
  ring(1.34, 1.04, 1.12, 0.83, 0.04, 0.34, '#b8b6a8')
  ring(1.31, 1.01, 1.16, 0.87, 0.38, 0.26, '#c7c4b4')
  ring(1.3, 1.0, 1.22, 0.92, 0.64, 0.1, '#6b7b6c')
  // Seating bays and the dark opening at the player race.
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2,
      rx = 1.28,
      ry = 0.98
    k.box(Math.cos(a) * rx, 0.28, Math.sin(a) * ry, 0.06, 0.2, 0.05, '#d2cfbe', 'stone', -a)
    k.box(Math.cos(a) * rx, 0.5, Math.sin(a) * ry, 0.04, 0.11, 0.04, '#4f6266', 'glass', -a)
  }
  k.box(0, 0.15, 0.86, 0.32, 0.1, 0.06, '#3f514b', 'stone')
  // Cricket pitch, southern roof band and scoreboard.
  k.box(0, 0.095, 0, 0.06, 0.012, 0.44, '#c9b98f', 'stone')
  for (let i = 0; i < 11; i++) {
    const a = 0.14 + (i / 10) * (Math.PI - 0.28)
    k.box(Math.cos(a) * 1.27, 0.79, Math.sin(a) * 0.97, 0.42, 0.03, 0.18, '#5e7768', 'stone', -a)
    k.box(Math.cos(a) * 1.27, 0.806, Math.sin(a) * 0.97, 0.42, 0.008, 0.19, '#d9d4bd', 'metal', -a)
  }
  k.box(0.55, 0.9, 0.86, 0.34, 0.2, 0.06, '#394744', 'stone')
  k.box(0.55, 0.9, 0.892, 0.26, 0.12, 0.012, '#8fb0a8', 'glass')
  // Four light towers.
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const tx = sx * 1.02,
      tz = sz * 0.74
    k.beam(new THREE.Vector3(tx, 0.08, tz), new THREE.Vector3(tx, 1.86, tz), 0.018, '#8c948c')
    for (let i = 0; i < 3; i++) {
      k.box(tx, 1.72 + i * 0.08, tz, 0.22, 0.035, 0.06, '#b8c3ba', 'metal')
      k.box(tx, 1.72 + i * 0.08, tz, 0.18, 0.02, 0.05, '#f2e6b7', 'accent')
    }
    k.box(tx, 1.9, tz, 0.06, 0.05, 0.06, '#d8c27a', 'accent')
  }
  k.count('Melbourne Cricket Ground')
}

/** St Paul's Cathedral: bluestone Gothic nave, twin west spires and a central spire. */
export function stPauls(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0)
  k.solid(rect(0.66, 0.92), 0, 0.1, '#4b565b')
  k.solid(rect(0.6, 0.86), 0.1, 0.62, BLUESTONE)
  k.windows(rect(0.6, 0.86), 0.2, 0.42, 'historic', 0.15, 0.2)
  k.band(rect(0.62, 0.88), 0.1, 0.025, 0.03, '#c9c1a9')
  gable(k, 0.62, 0.88, 0.72, 0.24, '#3f4a4e', 0, 0, 'z')
  // Transepts.
  for (const s of [-1, 1]) {
    k.solid(rect(0.22, 0.24), 0.1, 0.48, BLUESTONE)
    gable(k, 0.24, 0.26, 0.58, 0.14, '#3f4a4e', s * 0.38, 0, 'z')
  }
  // West towers and spires.
  for (const s of [-1, 1]) {
    k.solid(shift(rect(0.17, 0.17), s * 0.26, 0.32), 0.1, 0.86, BLUESTONE)
    k.band(shift(rect(0.19, 0.19), s * 0.26, 0.32), 0.82, 0.02, 0.025, '#c9c1a9')
    frustum(k, 0.09, 0.008, 0.88, 0.52, '#4b565b', 'stone', s * 0.26, 0.32)
    k.box(s * 0.26, 1.42, 0.4, 0.02, 0.16, 0.02, '#c9c1a9', 'metal')
  }
  // Central spire over the crossing.
  k.solid(rect(0.18, 0.18), 0.74, 0.34, BLUESTONE)
  frustum(k, 0.1, 0.006, 1.08, 0.85, '#4f5b60')
  k.box(0, 1.95, 0, 0.015, 0.2, 0.015, '#c9c1a9', 'metal')
  // Rose window and the west door.
  k.cylinder(0, 0.74, 0.45, 0.06, 0.02, '#7e9a9e', 'glass', 0.06, 12)
  k.box(0, 0.3, 0.45, 0.16, 0.3, 0.02, '#3d4848', 'glass')
  k.count("St Paul's Cathedral")
}

/** Shrine of Remembrance: a stepped classical plinth with a dark shrine and low pyramid. */
export function shrine(k: Kit, x: number, z: number) {
  k.at(x, z, 0.58, 0)
  const levels = [
    [1.34, 1.34, 0.0, 0.12, '#c9c3ad'],
    [1.18, 1.18, 0.12, 0.12, '#d2ccb7'],
    [1.0, 1.0, 0.24, 0.12, '#dad4bf'],
  ] as const
  for (const [w, d, y, h, color] of levels) {
    k.solid(rect(w, d), y, h, color)
    k.band(rect(w, d), y + h, 0.02, 0.02, '#efe8d2')
  }
  // Central shrine with a colonnade on all four sides.
  k.solid(rect(0.56, 0.56), 0.36, 0.5, '#d5cfb9')
  for (let i = 0; i < 6; i++) {
    const p = -0.22 + i * 0.088
    for (const s of [-1, 1]) {
      k.cylinder(p, 0.62, s * 0.28, 0.022, 0.42, '#e4ddc6', 'stone', 0.022, 6)
      k.cylinder(s * 0.28, 0.62, p, 0.022, 0.42, '#e4ddc6', 'stone', 0.022, 6)
    }
  }
  k.box(0, 0.62, 0, 0.4, 0.42, 0.4, '#4f5450', 'stone')
  k.box(0, 0.42, 0.202, 0.14, 0.24, 0.012, '#2f3a38', 'glass')
  k.box(0, 0.86, 0, 0.62, 0.06, 0.62, '#e2dbc5')
  // Low stepped pyramid and the eternal flame.
  frustum(k, 0.28, 0.06, 0.92, 0.32, '#cfc8b2')
  k.box(0, 1.25, 0, 0.3, 0.04, 0.3, '#bdb6a1')
  k.cylinder(0, 1.32, 0, 0.055, 0.1, '#c9a24a', 'accent', 0.03, 8)
  k.count('Shrine of Remembrance')
}

export const LANDMARK_BUILDERS: Record<LandmarkId, (k: Kit, x: number, z: number) => void> = {
  flinders,
  'fed-square': fedSquare,
  eureka,
  'arts-centre': artsCentre,
  exhibition,
  mcg,
  'st-pauls': stPauls,
  shrine,
}

/** Local-space envelopes used by the geometry tests (relative to the landmark origin). */
export const LANDMARK_ENVELOPES: Record<LandmarkId, { w: number; d: number; maxY: number }> = {
  flinders: { w: 2.5, d: 1.0, maxY: 1.8 },
  'fed-square': { w: 1.7, d: 1.1, maxY: 1.25 },
  eureka: { w: 1.0, d: 0.95, maxY: 4.45 },
  'arts-centre': { w: 0.95, d: 0.95, maxY: 3.95 },
  exhibition: { w: 2.8, d: 1.7, maxY: 2.35 },
  mcg: { w: 3.0, d: 2.6, maxY: 2.05 },
  'st-pauls': { w: 1.05, d: 1.2, maxY: 2.3 },
  shrine: { w: 1.7, d: 1.7, maxY: 1.65 },
}

export { CREAM, TRIM, BLUESTONE, GREEN, GOLD, clipped, type Kind }
