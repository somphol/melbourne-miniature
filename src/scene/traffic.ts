import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { RIVER } from './geo'
import { greenFor, type RoadNetwork } from './plan'
import type { WalkPath } from './environment'

type VehicleKind = 'tram' | 'car' | 'taxi' | 'bus' | 'van' | 'bike'

type Vehicle = {
  kind: VehicleKind
  route: string[]
  from: number
  to: number
  distance: number
  speed: number
  maxSpeed: number
  position: THREE.Vector3
  yaw: number
  slot: number
  length: number
}

type BoatKind = 'ferry' | 'punt' | 'rower' | 'bay-ferry'

class Model {
  parts: Record<string, THREE.BufferGeometry[]> = {}
  add(g: THREE.BufferGeometry, color: string, x: number, y: number, z: number, part = 'body') {
    g.translate(x, y, z)
    if (g.index) {
      const other = g.toNonIndexed()
      g.dispose()
      g = other
    }
    if (!g.getAttribute('uv')) {
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2))
    }
    const c = new THREE.Color(color),
      colors: number[] = []
    for (let i = 0; i < g.getAttribute('position').count; i++) colors.push(c.r, c.g, c.b)
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    ;(this.parts[part] ??= []).push(g)
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: string, part = 'body') {
    this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, part)
  }
  cylinder(x: number, y: number, z: number, r: number, h: number, color: string, rotation = 0, part = 'body') {
    const g = new THREE.CylinderGeometry(r, r, h, 8)
    g.rotateZ(rotation)
    this.add(g, color, x, y, z, part)
  }
  finish() {
    return Object.fromEntries(
      Object.entries(this.parts).map(([name, geos]) => {
        const g = mergeGeometries(geos, false)!
        geos.forEach((s) => s.dispose())
        return [name, g]
      }),
    )
  }
}

function vehicleModel(kind: VehicleKind) {
  const m = new Model()
  if (kind === 'tram') {
    const green = '#5b8f5e',
      cream = '#eee4c8',
      dark = '#3e4a48'
    m.box(0, 0.12, 0, 0.112, 0.12, 0.5, green)
    m.box(0, 0.215, 0, 0.108, 0.09, 0.48, cream)
    m.box(0, 0.095, 0, 0.118, 0.045, 0.505, dark)
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        m.box(s * 0.056, 0.22, -0.19 + i * 0.063, 0.006, 0.049, 0.044, '#ffd9a0', 'window')
      }
    }
    m.box(0, 0.22, -0.251, 0.085, 0.065, 0.012, '#385c65')
    m.box(0, 0.16, -0.253, 0.04, 0.04, 0.01, '#f4e2b1', 'head')
    m.box(0, 0.16, 0.253, 0.04, 0.04, 0.01, '#d9503f', 'tail')
    m.box(0, 0.282, 0, 0.05, 0.024, 0.16, '#d8d0b8')
    // Pantograph and the trolley pole.
    m.box(0, 0.36, 0.08, 0.012, 0.13, 0.012, '#4b5552')
    m.box(0, 0.43, 0.12, 0.16, 0.012, 0.012, '#4b5552')
    m.box(0, 0.43, 0.12, 0.012, 0.012, 0.1, '#4b5552')
    m.box(0, 0.3, -0.15, 0.09, 0.012, 0.06, '#d7b355')
    m.box(-0.045, 0.045, -0.16, 0.012, 0.05, 0.05, '#303b3a')
    m.box(0.045, 0.045, -0.16, 0.012, 0.05, 0.05, '#303b3a')
    m.box(-0.045, 0.045, 0.16, 0.012, 0.05, 0.05, '#303b3a')
    m.box(0.045, 0.045, 0.16, 0.012, 0.05, 0.05, '#303b3a')
  } else if (kind === 'bus') {
    m.box(0, 0.1, 0, 0.12, 0.15, 0.4, '#e8b44e')
    m.box(0, 0.19, 0, 0.116, 0.075, 0.385, '#efe6cd')
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) m.box(s * 0.061, 0.19, -0.16 + i * 0.064, 0.006, 0.05, 0.045, '#3b5f6b')
    }
    m.box(0, 0.17, -0.203, 0.1, 0.07, 0.008, '#3b5f6b')
    m.box(0, 0.135, -0.206, 0.04, 0.04, 0.008, '#fff0c2', 'head')
    m.box(0, 0.135, 0.206, 0.04, 0.04, 0.008, '#d9503f', 'tail')
    m.box(0, 0.235, 0, 0.06, 0.012, 0.11, '#b6b8aa')
    for (const x of [-0.065, 0.065]) {
      for (const z of [-0.13, 0.13]) m.cylinder(x, 0.045, z, 0.025, 0.02, '#303938', Math.PI / 2)
    }
  } else if (kind === 'van') {
    m.box(0, 0.095, 0.02, 0.098, 0.15, 0.26, '#e7e4d6')
    m.box(0, 0.16, -0.11, 0.09, 0.075, 0.07, '#e7e4d6')
    m.box(0, 0.165, -0.146, 0.07, 0.045, 0.008, '#466a76')
    m.box(0, 0.14, -0.172, 0.035, 0.025, 0.008, '#fff0c2', 'head')
    m.box(0, 0.15, 0.15, 0.03, 0.025, 0.008, '#d9503f', 'tail')
    for (const x of [-0.052, 0.052]) {
      for (const z of [-0.08, 0.08]) m.cylinder(x, 0.035, z, 0.022, 0.016, '#303938', Math.PI / 2)
    }
  } else if (kind === 'bike') {
    m.box(0, 0.07, 0, 0.016, 0.03, 0.16, '#5a756e')
    m.box(0, 0.115, 0.01, 0.03, 0.075, 0.04, '#d8a24f')
    m.box(0, 0.16, 0.01, 0.022, 0.022, 0.022, '#c9a27e')
    m.box(0, 0.085, -0.07, 0.008, 0.008, 0.08, '#4b5552')
    m.box(0, 0.06, -0.08, 0.035, 0.008, 0.035, '#303938')
    m.box(0, 0.06, 0.08, 0.035, 0.008, 0.035, '#303938')
    m.box(0, 0.09, -0.125, 0.02, 0.012, 0.008, '#fff0c2', 'head')
    m.box(0, 0.09, 0.12, 0.018, 0.012, 0.008, '#d9503f', 'tail')
  } else {
    const color = kind === 'taxi' ? '#e3b23d' : '#a9bcb6'
    m.box(0, 0.075, 0, 0.078, 0.038, 0.16, color)
    m.box(0, 0.105, 0.006, 0.066, 0.032, 0.082, color)
    m.box(0, 0.106, -0.042, 0.058, 0.023, 0.008, '#436a77')
    m.box(0, 0.106, 0.048, 0.055, 0.02, 0.008, '#436a77')
    m.box(0, 0.072, -0.084, 0.03, 0.018, 0.008, '#fff0c2', 'head')
    m.box(0, 0.072, 0.084, 0.028, 0.016, 0.008, '#d9503f', 'tail')
    if (kind === 'taxi') m.box(0, 0.13, 0, 0.038, 0.018, 0.026, '#f1db92')
    for (const x of [-0.042, 0.042]) {
      for (const z of [-0.052, 0.052]) m.cylinder(x, 0.033, z, 0.021, 0.013, '#303938', Math.PI / 2)
    }
  }
  return m.finish()
}

function boatModel(kind: BoatKind) {
  const m = new Model(),
    ferry = kind === 'ferry' || kind === 'bay-ferry',
    rower = kind === 'rower',
    length = kind === 'bay-ferry' ? 0.62 : kind === 'ferry' ? 0.56 : rower ? 0.5 : 0.34,
    w = kind === 'bay-ferry' ? 0.22 : kind === 'ferry' ? 0.19 : rower ? 0.09 : 0.15
  const shape = new THREE.Shape()
  shape.moveTo(-w / 2, -length * 0.34)
  shape.lineTo(-w * 0.42, length * 0.26)
  shape.quadraticCurveTo(0, length * 0.62, w * 0.42, length * 0.26)
  shape.lineTo(w / 2, -length * 0.34)
  shape.closePath()
  const hull = new THREE.ExtrudeGeometry(shape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.01,
    bevelSegments: 2,
  })
  hull.rotateX(-Math.PI / 2)
  m.add(hull, kind === 'punt' ? '#6d7e68' : '#e8e2cf', 0, 0.005, 0)
  if (ferry) {
    m.box(0, 0.12, 0.01, w * 0.72, 0.11, length * 0.5, '#ede7d4')
    m.box(0, 0.185, 0.01, w * 0.8, 0.025, length * 0.55, '#e8e2cf')
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) m.box(s * w * 0.36, 0.145, -length * 0.15 + i * length * 0.09, 0.008, 0.045, length * 0.06, '#3c6572')
    }
    m.box(0, 0.135, -length * 0.27, w * 0.6, 0.05, 0.008, '#3c6572')
    m.box(0, 0.21, -length * 0.12, 0.03, 0.05, 0.03, '#c9604e')
  } else if (rower) {
    m.box(0, 0.055, 0, w * 0.22, 0.018, length * 0.62, '#c9b28a')
    m.box(0, 0.08, -0.1, 0.02, 0.03, 0.03, '#4c5d5b')
    for (const s of [-1, 1]) {
      m.box(s * 0.12, 0.085, 0.02, 0.22, 0.008, 0.008, '#d8d2be')
    }
  } else {
    m.box(0, 0.055, 0.02, w * 0.55, 0.025, length * 0.4, '#c9b28a')
    m.box(0, 0.115, -0.02, 0.018, 0.14, 0.018, '#6d7e68')
  }
  for (const s of [-1, 1]) {
    m.box(s * w * 0.42, 0.085, 0, 0.008, 0.035, length * 0.64, '#c9c9b1')
  }
  return m.finish().body
}

const TRAM_GROUPS: Record<string, string[]> = {
  'Swanston Street': ['Swanston Street', 'Princes Bridge', 'St Kilda Road'],
  'St Kilda Road': ['St Kilda Road', 'Princes Bridge', 'Swanston Street'],
  'Princes Bridge': ['Princes Bridge', 'Swanston Street', 'St Kilda Road'],
  'Bourke Street': ['Bourke Street', 'Swanston Street'],
  'Collins Street': ['Collins Street', 'Swanston Street'],
  'Flinders Street': ['Flinders Street', 'Swanston Street', 'Princes Bridge'],
  'Spring Street': ['Spring Street', 'Bourke Street', 'Collins Street'],
  'Nicholson Street': ['Nicholson Street', 'Bourke Street', 'Collins Street'],
}

export function addCityLife(scene: THREE.Scene, network: RoadNetwork, walks: WalkPath[]) {
  const bodyMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.58,
      metalness: 0.16,
      side: THREE.DoubleSide,
    }),
    headMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#fff0c2', emissiveIntensity: 0 }),
    tailMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#f15639', emissiveIntensity: 0 }),
    windowMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: '#ffcf8a', emissiveIntensity: 0 })
  const fleets = new Map<VehicleKind, { count: number; meshes: THREE.InstancedMesh[] }>()
  const vehicles: Vehicle[] = []
  const dummy = new THREE.Object3D()
  let seed = 97
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const edgeKey = (a: number, b: number) => (a < b ? `${a},${b}` : `${b},${a}`)
  const edgeLookup = new Map<string, (typeof network.edges)[number]>()
  network.edges.forEach((e) => edgeLookup.set(edgeKey(e.a, e.b), e))
  const nameOf = (a: number, b: number) => edgeLookup.get(edgeKey(a, b))?.name ?? ''

  const counts: Record<VehicleKind, number> = { tram: 7, car: 16, taxi: 6, bus: 3, van: 4, bike: 6 }
  for (const kind of Object.keys(counts) as VehicleKind[]) {
    const count = counts[kind],
      parts = vehicleModel(kind),
      meshes = Object.entries(parts).map(([part, g]) => {
        const mesh = new THREE.InstancedMesh(
          g,
          part === 'head' ? headMaterial : part === 'tail' ? tailMaterial : part === 'window' ? windowMaterial : bodyMaterial,
          count,
        )
        mesh.castShadow = part === 'body' && kind !== 'bike'
        mesh.receiveShadow = true
        mesh.frustumCulled = false
        scene.add(mesh)
        return mesh
      })
    fleets.set(kind, { count, meshes })
    for (let i = 0; i < count; i++) {
      const candidates =
        kind === 'tram'
          ? network.edges.filter((e) => e.tram || e.name === 'Princes Bridge')
          : network.edges
      let edge = candidates[Math.floor(rand() * candidates.length)]
      if (!edge) edge = network.edges[0]
      const reverse = rand() > 0.5,
        from = reverse ? edge.b : edge.a,
        to = reverse ? edge.a : edge.b,
        A = network.nodes[from],
        B = network.nodes[to],
        length = Math.hypot(B.x - A.x, B.z - A.z)
      vehicles.push({
        kind,
        route: kind === 'tram' ? TRAM_GROUPS[edge.name] ?? [edge.name, 'Swanston Street', 'Princes Bridge'] : [],
        from,
        to,
        distance: rand() * length,
        speed: 0,
        maxSpeed: kind === 'tram' ? 0.2 : kind === 'bus' ? 0.18 : kind === 'bike' ? 0.27 : 0.23 + rand() * 0.06,
        position: new THREE.Vector3(A.x, 0.57, A.z),
        yaw: Math.atan2(-(B.x - A.x), -(B.z - A.z)),
        slot: i,
        length: kind === 'tram' ? 0.5 : kind === 'bus' ? 0.4 : kind === 'van' ? 0.3 : kind === 'bike' ? 0.16 : 0.2,
      })
    }
  }

  const beamGeometry = new THREE.PlaneGeometry(0.16, 0.6).rotateX(-Math.PI / 2)
  const beamMaterial = new THREE.MeshBasicMaterial({
    color: '#ffdfa2',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const beams = new THREE.InstancedMesh(beamGeometry, beamMaterial, vehicles.length)
  beams.frustumCulled = false
  scene.add(beams)

  const personCount = Math.min(44, walks.length * 2)
  const torso = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.04, 0.042, 0.023),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      personCount,
    ),
    heads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.015, 6, 5),
      new THREE.MeshStandardMaterial({ color: '#c9a582', roughness: 1 }),
      personCount,
    ),
    legs = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.01, 0.04, 0.011),
      new THREE.MeshStandardMaterial({ color: '#455f68', roughness: 1 }),
      personCount * 2,
    ),
    arms = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.008, 0.038, 0.009),
      new THREE.MeshStandardMaterial({ roughness: 1 }),
      personCount * 2,
    )
  const people = Array.from({ length: personCount }, (_, i) => ({
    route: walks[i % walks.length],
    progress: rand(),
    offset: rand() * 0.03 - 0.015,
    phase: rand() * 6.28,
    color: new THREE.Color(['#bc7759', '#5f99a0', '#d6ae62', '#68836e', '#d3c9b2', '#a27b92'][i % 6]),
  }))
  people.forEach((p, i) => {
    torso.setColorAt(i, p.color)
    arms.setColorAt(i * 2, p.color)
    arms.setColorAt(i * 2 + 1, p.color)
  })
  for (const mesh of [torso, heads, legs, arms]) {
    mesh.frustumCulled = false
    scene.add(mesh)
  }

  // River boats follow the Yarra centreline; the bay ferry works the south-west water.
  const riverCurve = new THREE.CatmullRomCurve3(
    RIVER.map((r) => new THREE.Vector3(r.x, 0.375, r.z)),
  )
  const bayCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-10.6, 0.375, 6.7),
    new THREE.Vector3(-9.2, 0.375, 7.7),
    new THREE.Vector3(-7.8, 0.375, 8.15),
    new THREE.Vector3(-6.4, 0.375, 8.35),
    new THREE.Vector3(-7.2, 0.375, 7.45),
  ])
  const boatData: { kind: BoatKind; route: THREE.CatmullRomCurve3; offset: number; speed: number; mesh: THREE.Mesh; wake: THREE.Mesh }[] = []
  const wakeGeo = new THREE.BufferGeometry()
  wakeGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-0.02, 0, 0.18, -0.15, 0, 0.6, -0.1, 0, 0.57, 0.02, 0, 0.18, 0.1, 0, 0.57, 0.15, 0, 0.6],
      3,
    ),
  )
  wakeGeo.computeVertexNormals()
  const wakeMaterial = new THREE.MeshBasicMaterial({
    color: '#d7e9d5',
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  for (const [kind, route, offset, speed] of [
    ['ferry', riverCurve, 0.04, 0.012],
    ['punt', riverCurve, 0.42, 0.009],
    ['rower', riverCurve, 0.72, 0.015],
    ['bay-ferry', bayCurve, 0.1, 0.018],
  ] as [BoatKind, THREE.CatmullRomCurve3, number, number][]) {
    const mesh = new THREE.Mesh(boatModel(kind), bodyMaterial)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    const wake = new THREE.Mesh(wakeGeo, wakeMaterial)
    scene.add(wake)
    boatData.push({ kind, route, offset, speed, mesh, wake })
  }

  function setModel(kind: VehicleKind, slot: number, position: THREE.Vector3, yaw: number) {
    dummy.position.copy(position)
    dummy.rotation.set(0, yaw, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    for (const mesh of fleets.get(kind)!.meshes) mesh.setMatrixAt(slot, dummy.matrix)
  }
  function headBeam(slot: number, p: THREE.Vector3, yaw: number, length: number) {
    dummy.position.copy(p).add(new THREE.Vector3(0, 0, -length / 2 - 0.22).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw))
    dummy.position.y = p.y + 0.012
    dummy.rotation.set(0, yaw, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    beams.setMatrixAt(slot, dummy.matrix)
  }

  function update(dt: number, time: number, night: number) {
    headMaterial.emissiveIntensity = night * 3.0
    windowMaterial.emissiveIntensity = night * 1.8
    tailMaterial.emissiveIntensity = 0.1 + night * 2
    beamMaterial.opacity = night * 0.18
    wakeMaterial.opacity = 0.3 - night * 0.14
    vehicles.forEach((v, index) => {
      const A = network.nodes[v.from],
        B = network.nodes[v.to],
        dx = B.x - A.x,
        dz = B.z - A.z,
        length = Math.hypot(dx, dz),
        remaining = length - v.distance,
        stopDistance = Math.min(0.16, length * 0.35),
        green = B.neighbors.length < 3 || greenFor(B, Math.abs(dz) > Math.abs(dx), time)
      let target = v.maxSpeed
      if (v.kind !== 'tram' && !green && remaining < 0.4) target = Math.min(target, Math.max(0, (remaining - stopDistance) * 1.7))
      for (const other of vehicles) {
        if (
          other !== v &&
          other.from === v.from &&
          other.to === v.to &&
          other.distance > v.distance &&
          other.distance - v.distance < (v.length + other.length) / 2 + 0.12
        )
          target = 0
      }
      v.speed = THREE.MathUtils.damp(v.speed, target, 5, dt)
      v.distance += v.speed * dt
      if (v.kind !== 'tram' && !green) v.distance = Math.min(v.distance, length - stopDistance)
      if (v.distance >= length - 0.002) {
        const options = B.neighbors.filter((n) => n !== v.from)
        let next = options.length ? options[Math.floor(rand() * options.length)] : v.from
        if (v.kind === 'tram') {
          const allowed = v.route.length ? v.route : [nameOf(v.from, v.to)]
          const tramOptions = options.filter((n) => allowed.includes(nameOf(v.to, n)))
          next = tramOptions.length ? tramOptions[Math.floor(rand() * tramOptions.length)] : v.from
        } else if (options.length && next === v.from) {
          next = options[Math.floor(rand() * options.length)]
        }
        if (next !== undefined) {
          v.from = v.to
          v.to = next
          v.distance = 0
        }
      }
      const C = network.nodes[v.from],
        D = network.nodes[v.to],
        vx = D.x - C.x,
        vz = D.z - C.z,
        len = Math.hypot(vx, vz),
        lane = v.kind === 'tram' ? 0 : 0.045,
        t = Math.min(1, v.distance / Math.max(len, 1e-5)),
        edge = edgeLookup.get(edgeKey(v.from, v.to)),
        ground = edge?.bridge ? 0.634 : 0.57
      const desired = new THREE.Vector3(
        C.x + vx * t - (vz / len) * lane,
        ground,
        C.z + vz * t + (vx / len) * lane,
      )
      const yaw = Math.atan2(-vx, -vz)
      if (time < 0.1) v.position.copy(desired)
      else v.position.lerp(desired, 1 - Math.exp(-dt * 12))
      const diff = Math.atan2(Math.sin(yaw - v.yaw), Math.cos(yaw - v.yaw))
      v.yaw += diff * (1 - Math.exp(-dt * 9))
      setModel(v.kind, v.slot, v.position, v.yaw)
      headBeam(index, v.position, v.yaw, v.length)
    })
    for (const fleet of fleets.values()) for (const mesh of fleet.meshes) mesh.instanceMatrix.needsUpdate = true
    beams.instanceMatrix.needsUpdate = true

    people.forEach((p, i) => {
      const len = p.route.curve.getLength(),
        u = (p.progress + (time * p.route.speed) / Math.max(len, 0.001)) % 2,
        t = u < 1 ? u : 2 - u,
        sign = u < 1 ? 1 : -1,
        pos = p.route.curve.getPoint(t),
        tangent = p.route.curve.getTangent(t).multiplyScalar(sign),
        yaw = Math.atan2(tangent.x, tangent.z),
        stride = Math.sin(time * 5 + p.phase) * 0.3
      dummy.position.copy(pos).add(new THREE.Vector3(p.offset, 0.055, 0))
      dummy.rotation.set(0, yaw, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      torso.setMatrixAt(i, dummy.matrix)
      dummy.position.y = pos.y + 0.096
      dummy.updateMatrix()
      heads.setMatrixAt(i, dummy.matrix)
      for (const s of [-1, 1]) {
        dummy.position
          .copy(pos)
          .add(new THREE.Vector3(s * 0.009 + p.offset, 0.024, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw))
        dummy.rotation.set(stride * s, yaw, 0)
        dummy.updateMatrix()
        legs.setMatrixAt(i * 2 + (s === 1 ? 1 : 0), dummy.matrix)
        dummy.position
          .copy(pos)
          .add(new THREE.Vector3(s * 0.021 + p.offset, 0.06, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw))
        dummy.rotation.set(-stride * s, yaw, 0)
        dummy.updateMatrix()
        arms.setMatrixAt(i * 2 + (s === 1 ? 1 : 0), dummy.matrix)
      }
    })
    for (const mesh of [torso, heads, legs, arms]) mesh.instanceMatrix.needsUpdate = true

    boatData.forEach((boat, i) => {
      const u = (boat.offset + time * boat.speed) % 2,
        t = u < 1 ? u : 2 - u,
        sign = u < 1 ? 1 : -1,
        pos = boat.route.getPoint(t),
        tangent = boat.route.getTangent(t).multiplyScalar(sign)
      boat.mesh.position.copy(pos)
      boat.mesh.rotation.set(
        Math.sin(time * 0.7 + i) * 0.015,
        Math.atan2(-tangent.x, -tangent.z),
        Math.cos(time * 0.6 + i) * 0.012,
      )
      boat.wake.position.copy(pos)
      boat.wake.position.y = 0.38
      boat.wake.rotation.set(0, boat.mesh.rotation.y, 0)
      boat.wake.scale.set(1 + Math.sin(time + i) * 0.06, 1, 1 + Math.sin(time * 0.8 + i) * 0.08)
    })
  }

  return {
    vehicles,
    boats: boatData.map((b) => b.mesh),
    people,
    update,
  }
}
