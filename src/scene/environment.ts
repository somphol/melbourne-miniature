import * as THREE from 'three'
import { Kit } from './kit'
import {
  LANDMARKS,
  NORTH_LAND,
  PARKS,
  SOUTH_LAND,
  TRAY,
  insideLand,
  inWater,
  northBank,
  roundedRectPoints,
  southBank,
  type ParkSite,
  type Point,
} from './geo'
import { greenFor, type Footprint, type PlanResult } from './plan'

export type WalkPath = { curve: THREE.Curve<THREE.Vector3>; speed: number }

type Leaf = { x: number; y: number; z: number; s: number; variant: number }

const DAY = {
  land: '#c9c4ac',
  park: '#7d9b63',
  rim: '#b7ab8c',
  water: '#3b7a70',
  road: '#59666a',
  path: '#d8cfae',
}

function shapeFrom(points: Point[]) {
  const shape = new THREE.Shape()
  points.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)))
  shape.closePath()
  return shape
}

function slab(points: Point[], top: number, depth: number, material: THREE.Material) {
  const g = new THREE.ExtrudeGeometry(shapeFrom(points), {
    depth,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 1,
    curveSegments: 6,
  })
  g.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(g, material)
  mesh.position.y = top - depth
  mesh.receiveShadow = true
  mesh.castShadow = false
  return mesh
}

function occupied(x: number, z: number, footprints: Footprint[], margin = 0.04) {
  return footprints.some(
    (b) => Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin,
  )
}

export function buildEnvironment(scene: THREE.Scene, plan: PlanResult, footprints: Footprint[]) {
  const kit = new Kit(scene)
  kit.at(0, 0, 0)
  const walks: WalkPath[] = []
  const signals: {
    mesh: THREE.Mesh
    node: number
    vertical: boolean
    isGreen: boolean
  }[] = []
  const poolPositions: THREE.Vector3[] = []
  const leafData: Leaf[][] = [[], [], []]
  const swayTrees: {
    mesh: THREE.InstancedMesh
    data: Leaf[]
  }[] = []
  const dummy = new THREE.Object3D()
  let seed = 731
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  // ---- Tray, water and land ---------------------------------------------------------------
  const rimMat = new THREE.MeshStandardMaterial({ color: DAY.rim, roughness: 0.98, dithering: true })
  const rim = slab(roundedRectPoints(TRAY.w + 0.2, TRAY.d + 0.2, TRAY.r, 10), 0.3, 0.62, rimMat)
  rim.position.y = -0.32
  scene.add(rim)

  const landMat = new THREE.MeshStandardMaterial({ color: DAY.land, roughness: 1, dithering: true })
  const parkMat = new THREE.MeshStandardMaterial({ color: DAY.park, roughness: 1, dithering: true })
  const north = slab(NORTH_LAND, 0.5, 0.32, landMat)
  const south = slab(SOUTH_LAND, 0.5, 0.32, landMat)
  scene.add(north, south)

  const waterTime = { value: 0 },
    waterNight = { value: 0 }
  const waterMat = new THREE.MeshStandardMaterial({
    color: DAY.water,
    roughness: 0.32,
    metalness: 0.18,
    dithering: true,
  })
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.uWaterTime = waterTime
    shader.uniforms.uWaterNight = waterNight
    shader.vertexShader =
      'uniform float uWaterTime; varying vec3 vWorld;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += .007*sin(.35*position.x+.22*position.y-.6*uWaterTime)+.006*sin(-.18*position.x+.42*position.y+.45*uWaterTime);
       vWorld = (modelMatrix * vec4(transformed,1.0)).xyz;`,
    )
    shader.fragmentShader =
      'uniform float uWaterTime;uniform float uWaterNight;varying vec3 vWorld;\n' +
      shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clipping_planes_fragment>',
      `#include <clipping_planes_fragment>
       vec2 q = abs(vWorld.xz) - vec2(${(TRAY.w / 2 - TRAY.r).toFixed(3)}, ${(TRAY.d / 2 - TRAY.r).toFixed(3)});
       if (length(max(q,0.0)) + min(max(q.x,q.y),0.0) - ${TRAY.r.toFixed(3)} > 0.0) discard;`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_begin>',
      `#include <normal_fragment_begin>
       normal.x += .018*sin(vWorld.x*4.+vWorld.z*1.8+uWaterTime*.6);
       normal.z += .014*cos(vWorld.z*5.-uWaterTime*.45);
       normal = normalize(normal);`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float streak = pow(max(0., sin(vWorld.z*34.+sin(vWorld.x*5.+uWaterTime)*2.)), 14.);
       totalEmissiveRadiance += vec3(.62,.36,.12)*uWaterNight*streak*exp(-pow((vWorld.z-3.7)*.55,2.))*1.6;
       totalEmissiveRadiance += vec3(.18,.28,.30)*uWaterNight*exp(-pow((vWorld.z-3.7)*1.7,2.))*.5;`,
    )
  }
  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(TRAY.w, TRAY.d, 84, 62).rotateX(-Math.PI / 2),
    waterMat,
  )
  surface.position.y = 0.35
  surface.receiveShadow = true
  scene.add(surface)

  // ---- Parks -------------------------------------------------------------------------------
  const parks: ParkSite[] = PARKS
  for (const park of parks) {
    kit.box(park.x, 0.512, park.z, park.w - 0.05, 0.025, park.d - 0.05, park.kind === 'trees' ? '#708f56' : '#7f9c62', 'stone')
    const path = park.kind === 'trees' ? '#c9bf9f' : DAY.path
    if (park.id === 'carlton') {
      kit.box(park.x, 0.526, park.z, park.w - 0.3, 0.012, 0.14, path)
      kit.box(park.x, 0.526, park.z, 0.14, 0.012, park.d - 0.3, path)
      kit.cylinder(park.x, 0.55, park.z + 0.85, 0.17, 0.06, '#c9c1a7', 'stone', 0.14, 14)
      kit.cylinder(park.x, 0.58, park.z + 0.85, 0.12, 0.015, '#6fa09a', 'glass', 0.12, 14)
    } else if (park.id === 'fitzroy') {
      kit.box(park.x - 0.15, 0.526, park.z, 0.14, 0.012, park.d - 0.2, path, 'stone', 0.5)
      kit.box(park.x + 0.3, 0.526, park.z, 0.12, 0.012, park.d - 0.45, path, 'stone', -0.4)
    } else if (park.id === 'treasury' || park.id === 'flagstaff') {
      kit.box(park.x, 0.526, park.z, park.w - 0.22, 0.012, 0.1, path)
      kit.box(park.x, 0.526, park.z, 0.1, 0.012, park.d - 0.22, path)
    } else if (park.id === 'botanic') {
      // Lake, island and the Tan running track around the gardens.
      const lake = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 28).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: '#4d8b84', roughness: 0.3, metalness: 0.3 }),
      )
      lake.scale.set(1, 1, 0.62)
      lake.position.set(park.x + 0.3, 0.528, park.z - 0.05)
      scene.add(lake)
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2
        kit.box(
          park.x + Math.cos(a) * 1.2,
          0.527,
          park.z + Math.sin(a) * 0.92,
          0.11,
          0.012,
          0.42,
          path,
          'stone',
          -a,
        )
      }
      kit.box(park.x, 0.526, park.z + 0.9, park.w - 0.2, 0.012, 0.08, path)
      kit.box(park.x - 1.2, 0.526, park.z, 0.08, 0.012, park.d - 0.2, path)
    } else if (park.id === 'yarra') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        kit.box(
          park.x + Math.cos(a) * 1.55,
          0.526,
          park.z + Math.sin(a) * 1.15,
          0.09,
          0.012,
          0.65,
          path,
          'stone',
          -a,
        )
      }
    }
  }

  // ---- Roads, kerbs, lane markings and tram rails -----------------------------------------
  plan.network.edges.forEach((edge, index) => {
    if (edge.bridge) return
    const A = plan.network.nodes[edge.a],
      B = plan.network.nodes[edge.b],
      dx = B.x - A.x,
      dz = B.z - A.z,
      len = Math.hypot(dx, dz)
    if (len < 0.02) return
    const yaw = -Math.atan2(dz, dx),
      nx = dz / len,
      nz = -dx / len,
      w = edge.width
    kit.box((A.x + B.x) / 2, 0.526, (A.z + B.z) / 2, len + 0.012, 0.026, w, DAY.road, 'stone', yaw)
    if (w >= 0.17) {
      for (const side of [-1, 1]) {
        const off = (w / 2 + 0.035) * side
        kit.box(
          (A.x + B.x) / 2 + nx * off,
          0.542,
          (A.z + B.z) / 2 + nz * off,
          Math.max(0.01, len - 0.16),
          0.018,
          0.055,
          '#c7c1ad',
          'stone',
          yaw,
        )
        kit.box(
          (A.x + B.x) / 2 + nx * (w / 2 + 0.005) * side,
          0.548,
          (A.z + B.z) / 2 + nz * (w / 2 + 0.005) * side,
          Math.max(0.01, len - 0.18),
          0.012,
          0.012,
          '#e2d8bd',
          'stone',
          yaw,
        )
      }
    }
    if (w >= 0.22 && len > 0.45) {
      for (let t = 0.18; t < len - 0.1; t += 0.3) {
        kit.box(A.x + (dx * t) / len, 0.542, A.z + (dz * t) / len, 0.09, 0.006, 0.009, '#e0d7bc', 'stone', yaw)
      }
    }
    if (edge.tram) {
      for (const side of [-1, 1]) {
        kit.box(
          (A.x + B.x) / 2 + nx * 0.042 * side,
          0.541,
          (A.z + B.z) / 2 + nz * 0.042 * side,
          len + 0.01,
          0.008,
          0.012,
          '#b8b6a8',
          'metal',
          yaw,
        )
      }
      kit.box((A.x + B.x) / 2, 0.995, (A.z + B.z) / 2, len + 0.01, 0.006, 0.006, '#4f5a58', 'metal', yaw)
    }
    // Sidewalk walks for pedestrians.
    if (index % 3 === 0) {
      for (const side of [-1, 1]) {
        const off = (w / 2 + 0.075) * side,
          px = A.x + dx * 0.25 + nx * off,
          pz = A.z + dz * 0.25 + nz * off,
          qx = A.x + dx * 0.8 + nx * off,
          qz = A.z + dz * 0.8 + nz * off
        if (
          insideLand(px, pz) &&
          insideLand(qx, qz) &&
          !occupied(px, pz, footprints, 0.03) &&
          !occupied(qx, qz, footprints, 0.03)
        ) {
          walks.push({
            curve: new THREE.LineCurve3(new THREE.Vector3(px, 0.565, pz), new THREE.Vector3(qx, 0.565, qz)),
            speed: 0.035 + rand() * 0.025,
          })
        }
      }
    }
    // Lamps along the kerb.
    if (index % 8 === 2) {
      const off = w / 2 + 0.075,
        px = (A.x + B.x) / 2 + nx * off,
        pz = (A.z + B.z) / 2 + nz * off
      if (!occupied(px, pz, footprints, 0.06) && insideLand(px, pz)) {
        kit.cylinder(px, 0.74, pz, 0.011, 0.34, '#5d736b', 'metal')
        kit.box(px + 0.025, 0.92, pz, 0.07, 0.018, 0.045, '#ffdd9b', 'accent')
        poolPositions.push(new THREE.Vector3(px + 0.025, 0.545, pz))
      }
    }
    // A bench, bin or tree on the quiet stretches.
    if (index % 11 === 5) {
      const off = -(w / 2 + 0.14),
        px = (A.x + B.x) / 2 + nx * off,
        pz = (A.z + B.z) / 2 + nz * off
      if (!occupied(px, pz, footprints, 0.08) && insideLand(px, pz)) {
        kit.box(px, 0.57, pz, 0.17, 0.015, 0.06, '#a98c64', 'stone', yaw)
        kit.box(px, 0.6, pz, 0.17, 0.06, 0.012, '#a98c64', 'stone', yaw)
        kit.box(px - 0.06, 0.55, pz, 0.012, 0.04, 0.05, '#4b5b58', 'metal', yaw)
        kit.box(px + 0.06, 0.55, pz, 0.012, 0.04, 0.05, '#4b5b58', 'metal', yaw)
      }
    }
    if (index % 23 === 7 && edge.tram) {
      const off = w / 2 + 0.18,
        px = (A.x + B.x) / 2 + nx * off,
        pz = (A.z + B.z) / 2 + nz * off
      if (!occupied(px, pz, footprints, 0.12) && insideLand(px, pz)) {
        kit.box(px, 0.78, pz, 0.38, 0.03, 0.16, '#7d958b', 'metal', yaw)
        kit.box(px - 0.17, 0.62, pz, 0.03, 0.3, 0.03, '#6c7f76', 'metal', yaw)
        kit.box(px + 0.17, 0.62, pz, 0.03, 0.3, 0.03, '#6c7f76', 'metal', yaw)
        kit.box(px, 0.66, pz, 0.34, 0.06, 0.12, '#d6d0bb', 'stone', yaw)
        kit.cylinder(px + 0.3, 0.75, pz, 0.014, 0.4, '#4f8a6d', 'metal')
        kit.box(px + 0.3, 0.94, pz, 0.09, 0.11, 0.025, '#e0b34e', 'accent')
      }
    }
  })

  // ---- Street trees ------------------------------------------------------------------------
  function addTree(x: number, z: number, s: number, variant: number) {
    if (!insideLand(x, z) || inWater(x, z) || occupied(x, z, footprints, 0.045)) return
    kit.cylinder(x, 0.66, z, 0.012, 0.2, '#817150')
    leafData[variant].push({ x, y: 0.82 + s * 0.9, z, s, variant })
  }
  for (const park of parks) {
    const count = Math.min(park.kind === 'trees' ? 34 : 26, Math.round(park.w * park.d * 5))
    for (let i = 0; i < count * 3 && leafData[0].length + leafData[1].length + leafData[2].length < 230; i++) {
      const x = park.x + (rand() - 0.5) * (park.w - 0.24),
        z = park.z + (rand() - 0.5) * (park.d - 0.24)
      if (park.id === 'botanic' && Math.hypot((x - park.x - 0.3) / 0.58, (z - park.z + 0.05) / 0.42) < 1.1) continue
      addTree(x, z, 0.09 + rand() * 0.11, i % 3)
    }
  }
  for (let i = 0, edgeIndex = 0; i < plan.network.edges.length && leafData[0].length + leafData[1].length + leafData[2].length < 260; i++) {
    const edge = plan.network.edges[i]
    if (edge.bridge) continue
    edgeIndex++
    if (edgeIndex % 6 !== 3) continue
    const A = plan.network.nodes[edge.a],
      B = plan.network.nodes[edge.b],
      dx = B.x - A.x,
      dz = B.z - A.z,
      len = Math.hypot(dx, dz)
    if (len < 0.2) continue
    const off = edge.width / 2 + 0.16,
      nx = dz / len,
      nz = -dx / len,
      x = (A.x + B.x) / 2 + nx * off,
      z = (A.z + B.z) / 2 + nz * off
    addTree(x, z, 0.075 + rand() * 0.055, edgeIndex % 3)
  }
  const leafGeometry = [
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.SphereGeometry(1, 7, 5),
    new THREE.ConeGeometry(1, 2.2, 7),
  ]
  const leafMaterial = new THREE.MeshStandardMaterial({ roughness: 0.95, vertexColors: false })
  for (let type = 0; type < 3; type++) {
    const data = leafData[type]
    const mesh = new THREE.InstancedMesh(leafGeometry[type], leafMaterial, Math.max(1, data.length))
    data.forEach((_d, i) => {
      mesh.setColorAt(i, new THREE.Color(['#71955a', '#93ab6e', '#5b8666'][type]).multiplyScalar(0.9 + rand() * 0.2))
    })
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.count = data.length
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    scene.add(mesh)
    swayTrees.push({ mesh, data })
  }

  // ---- River walls, promenades, railings and piers ----------------------------------------
  const wallSegments = (which: 'north' | 'south') => {
    for (let x = -11.8; x < 11.8; x += 0.4) {
      const bank = which === 'north' ? northBank(x) : southBank(x),
        bank2 = which === 'north' ? northBank(x + 0.4) : southBank(x + 0.4),
        dx = 0.4,
        dz = bank2 - bank,
        len = Math.hypot(dx, dz),
        yaw = -Math.atan2(dz, dx),
        landSide = which === 'north' ? -1 : 1,
        wallZ = bank + (which === 'north' ? 0.018 : -0.018)
      kit.box(x + 0.2, 0.4, wallZ, len + 0.02, 0.24, 0.07, '#6f7a78', 'stone', yaw)
      kit.box(x + 0.2, 0.535, wallZ, len + 0.02, 0.02, 0.09, '#d8cfb4', 'stone', yaw)
      const promZ = bank + landSide * 0.115
      kit.box(x + 0.2, 0.53, promZ, len + 0.02, 0.022, 0.17, '#c9bfa2', 'stone', yaw)
      // Railing on the water side.
      if (Math.round((x + 11.8) / 0.4) % 2 === 0) {
        kit.box(x + 0.2, 0.575, wallZ + (which === 'north' ? 0.02 : -0.02), 0.012, 0.09, 0.012, '#4f615d', 'metal', yaw)
      }
      kit.box(x + 0.2, 0.618, wallZ + (which === 'north' ? 0.02 : -0.02), len + 0.02, 0.008, 0.008, '#4f615d', 'metal', yaw)
      // Promenade lamps and a long walk on the south bank.
      if (which === 'south' && Math.round((x + 11.8) / 0.4) % 4 === 0) {
        kit.cylinder(x + 0.2, 0.75, promZ + 0.07, 0.011, 0.38, '#5d736b', 'metal')
        kit.box(x + 0.2, 0.96, promZ + 0.07, 0.075, 0.018, 0.045, '#ffdd9b', 'accent')
        poolPositions.push(new THREE.Vector3(x + 0.2, 0.545, promZ + 0.07))
      }
    }
    if (which === 'south') {
      for (let x = -3.2; x < 2.6; x += 0.45) {
        walks.push({
          curve: new THREE.LineCurve3(
            new THREE.Vector3(x, 0.56, southBank(x) + 0.13),
            new THREE.Vector3(x + 0.45, 0.56, southBank(x + 0.45) + 0.13),
          ),
          speed: 0.04,
        })
      }
    }
  }
  wallSegments('north')
  wallSegments('south')

  for (const [x, side] of [
    [-7.2, 'north'],
    [-5.8, 'north'],
    [1.1, 'south'],
    [2.3, 'south'],
  ] as [number, 'north' | 'south'][]) {
    const bank = side === 'north' ? northBank(x) : southBank(x),
      dir = side === 'north' ? 1 : -1,
      z = bank + dir * 0.28
    kit.box(x, 0.37, z, 0.2, 0.07, 0.62, '#b7a889', 'stone')
    for (let i = 0; i < 6; i++) kit.box(x - 0.09 + i * 0.036, 0.415, z, 0.03, 0.012, 0.6, '#c8b89a', 'stone')
    for (const dz of [-0.18, 0.18]) {
      kit.cylinder(x + 0.1, 0.47, z + dz, 0.018, 0.16, '#5c6d67', 'metal', 0.01, 7)
    }
  }

  // ---- Bridges -----------------------------------------------------------------------------
  for (const bridge of plan.bridges) {
    const mid = (bridge.z0 + bridge.z1) / 2,
      span = bridge.z1 - bridge.z0
    kit.box(bridge.x, 0.585, mid, bridge.width, 0.075, span + 0.35, '#8d8a7b', 'stone')
    kit.box(bridge.x, 0.628, mid, bridge.width - 0.02, 0.012, span + 0.3, '#c6bda6', 'stone')
    for (const side of [-1, 1]) {
      kit.box(
        bridge.x + (bridge.width / 2 - 0.018) * side,
        0.67,
        mid,
        0.022,
        0.12,
        span + 0.32,
        '#6b7774',
        'stone',
      )
      kit.box(
        bridge.x + (bridge.width / 2 - 0.018) * side,
        0.74,
        mid,
        0.028,
        0.016,
        span + 0.34,
        '#d8cfb4',
        'stone',
      )
    }
    // Stone piers with a shallow arch shadow between them.
    for (const t of [0.28, 0.72]) {
      kit.box(bridge.x, 0.37, bridge.z0 + span * t, bridge.width + 0.03, 0.38, 0.16, '#7d847d', 'stone')
      kit.box(bridge.x, 0.21, bridge.z0 + span * t, bridge.width + 0.06, 0.08, 0.22, '#68706b', 'stone')
    }
    kit.box(bridge.x, 0.505, mid, bridge.width - 0.04, 0.06, span - 0.18, '#3f4b4c', 'stone')
    if (bridge.tram) {
      for (const side of [-1, 1]) {
        kit.box(bridge.x + 0.042 * side, 0.612, mid, 0.012, 0.008, span + 0.3, '#b8b6a8', 'metal')
      }
    }
    for (const t of [0.1, 0.5, 0.9]) {
      kit.cylinder(bridge.x + bridge.width / 2 - 0.035, 0.8, bridge.z0 + span * t, 0.014, 0.32, '#5d736b', 'metal')
      kit.box(bridge.x + bridge.width / 2 - 0.035, 0.97, bridge.z0 + span * t, 0.07, 0.018, 0.04, '#ffdd9b', 'accent')
      poolPositions.push(new THREE.Vector3(bridge.x + bridge.width / 2 - 0.035, 0.545, bridge.z0 + span * t))
    }
  }

  // ---- Signals -----------------------------------------------------------------------------
  for (let id = 0; id < plan.network.nodes.length; id++) {
    const n = plan.network.nodes[id]
    if (n.neighbors.length < 3 || id % 5 !== 0) continue
    const next = plan.network.nodes[n.neighbors[0]],
      vertical = Math.abs(next.z - n.z) > Math.abs(next.x - n.x),
      x = n.x + (vertical ? 0.16 : -0.16),
      z = n.z + (vertical ? -0.16 : 0.16)
    if (occupied(x, z, footprints, 0.03) || !insideLand(x, z)) continue
    kit.cylinder(x, 0.75, z, 0.009, 0.42, '#9c9276', 'metal')
    kit.box(x, 0.97, z, 0.045, 0.11, 0.038, '#4e5a58', 'stone')
    for (const [name, y, color] of [
      ['red', 0.99, '#ef7151'],
      ['green', 0.95, '#89c6a2'],
    ] as const) {
      const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 })
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), material)
      m.position.set(x, y, z + 0.022)
      scene.add(m)
      signals.push({ mesh: m, node: id, vertical, isGreen: name === 'green' })
    }
  }

  // ---- Light pools at night ----------------------------------------------------------------
  const glow = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { night: { value: 0 } },
    vertexShader:
      'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}',
    fragmentShader:
      'varying vec2 vUv;uniform float night;void main(){float d=length(vUv-.5)*2.;gl_FragColor=vec4(1.,.68,.27,exp(-d*d*5.)*.45*night);}',
  })
  const pools = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1.1, 1.2).rotateX(-Math.PI / 2),
      glow,
      poolPositions.length,
    ),
    poolObject = new THREE.Object3D()
  poolPositions.forEach((p, i) => {
    poolObject.position.copy(p)
    poolObject.updateMatrix()
    pools.setMatrixAt(i, poolObject.matrix)
  })
  scene.add(pools)

  kit.finish()

  const materials = { landMat, parkMat, rimMat, waterMat }
  const dayLand = new THREE.Color(DAY.land),
    nightLand = new THREE.Color('#2b3844')
  const dayPark = new THREE.Color(DAY.park),
    nightPark = new THREE.Color('#2a3b35')
  const dayRim = new THREE.Color(DAY.rim),
    nightRim = new THREE.Color('#2b3035')
  const dayWater = new THREE.Color(DAY.water),
    nightWater = new THREE.Color('#234652')

  function update(time: number, night: number) {
    waterTime.value = time
    waterNight.value = night
    waterMat.color.copy(dayWater).lerp(nightWater, night)
    landMat.color.copy(dayLand).lerp(nightLand, night)
    parkMat.color.copy(dayPark).lerp(nightPark, night)
    rimMat.color.copy(dayRim).lerp(nightRim, night)
    glow.uniforms.night.value = night
    leafMaterial.color.set('#ffffff').lerp(new THREE.Color('#6c8174'), night)
    kit.update(night)
    for (const group of swayTrees) {
      group.data.forEach((d, i) => {
        dummy.position.set(d.x, d.y, d.z)
        dummy.rotation.set(Math.sin(time * 0.42 + i) * 0.02, 0, Math.cos(time * 0.38 + i) * 0.014)
        dummy.scale.set(d.s, d.s * (d.variant === 1 ? 1.35 : 1), d.s)
        dummy.updateMatrix()
        group.mesh.setMatrixAt(i, dummy.matrix)
      })
      group.mesh.instanceMatrix.needsUpdate = true
    }
    for (const signal of signals) {
      const phase = (time + plan.network.nodes[signal.node].signal * 1.3) % 12,
        green = signal.vertical ? phase < 5.2 : phase >= 6 && phase < 11.2
      const material = signal.mesh.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = (signal.isGreen ? green : !green) ? 1.8 : 0.02
    }
  }

  return { walks, update, signals, materials }
}
