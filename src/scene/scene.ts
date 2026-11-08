import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createCameraGuard } from './camera'
import { LANDMARK_BUILDERS, LANDMARK_ENVELOPES } from './landmarks'
import { building, FAMILY_CHOICES, heightFor, type Family } from './buildings'
import { buildEnvironment } from './environment'
import { addCityLife } from './traffic'
import { Kit } from './kit'
import { planCity, type Footprint } from './plan'
import {
  DEBUG_VIEWS,
  LANDMARKS,
  RESERVED,
  insideLand,
  riverAt,
  type LandmarkId,
} from './geo'
import { QUALITY, type QualityTier } from '../config'

export interface CityState {
  azimuth: number
  polar: number
  distance: number
  target: [number, number, number]
  night: number
  targetNight: 0 | 1
  rotating: boolean
  transition: boolean
  cameraClear: boolean
  time: number
}
export interface CityFacts {
  roadEdges: number
  vehicles: number
  pedestrians: number
  boats: number
  buildings: number
  triangles: number
  drawCalls: number
}
export type CityAPI = {
  tick: (dt: number) => void
  state: () => CityState
  facts: CityFacts
  setNight: (value: boolean) => void
  setRotate: (value: boolean) => void
  reset: () => void
  home: () => void
  focus: (i: number) => void
  zoom: (factor: number) => void
  orbitBy: (dTheta: number, dPhi: number) => void
  panBy: (dx: number, dz: number) => void
  screenshot: () => string
  dispose: () => void
}
export interface CityOptions {
  quality: QualityTier
  reducedMotion: boolean
  live: boolean
  view: string | null
  viewOffset: () => boolean
  onFrame: () => void
}

export const landmarkAnchors = LANDMARKS
export const landmarkViews = LANDMARKS.map((l) => ({ look: l.look, offset: l.offset }))
export const landmarkIds = LANDMARKS.map((l) => l.id) as LandmarkId[]

type Lot = {
  x: number
  z: number
  w: number
  d: number
  rot: number
  height: number
  family: Family
  variant: number
  district: string
}

export function createCity(container: HTMLDivElement, options: CityOptions): CityAPI {
  const tier = QUALITY[options.quality]
  const scene = new THREE.Scene()
  const dayBg = new THREE.Color('#dfe9e6'),
    nightBg = new THREE.Color('#0e1a2b')
  scene.background = dayBg.clone()
  scene.fog = new THREE.Fog(dayBg, 46, 132)
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier.pixelRatio))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = environment.texture
  scene.environmentIntensity = 0.62
  pmrem.dispose()

  const camera = new THREE.PerspectiveCamera(38, container.clientWidth / container.clientHeight, 0.05, 220)
  const initial = new THREE.Vector3(10, 19.5, 30.5),
    initialTarget = new THREE.Vector3(0.2, 0.6, 0.8)
  const requested = options.view ? DEBUG_VIEWS[options.view] : undefined
  camera.position.copy(requested ? new THREE.Vector3().fromArray(requested.position) : initial)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(requested ? new THREE.Vector3().fromArray(requested.target) : initialTarget)
  controls.enableDamping = true
  controls.dampingFactor = 0.065
  controls.minDistance = 3
  controls.maxDistance = 76
  controls.maxPolarAngle = Math.PI * 0.465
  controls.minPolarAngle = 0.02
  controls.autoRotateSpeed = 0.45
  controls.zoomSpeed = 0.72
  controls.panSpeed = 0.66
  controls.screenSpacePanning = false
  controls.listenToKeyEvents(window)
  controls.keyPanSpeed = 20

  const hemi = new THREE.HemisphereLight('#d9efff', '#a8a88a', 1.4)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#fff2d2', 2.35)
  sun.position.set(-14, 26, 12)
  sun.castShadow = true
  sun.shadow.mapSize.set(tier.shadowMap, tier.shadowMap)
  Object.assign(sun.shadow.camera, {
    left: -23,
    right: 23,
    top: 24,
    bottom: -24,
    near: 1,
    far: 80,
  })
  sun.shadow.normalBias = 0.035
  sun.shadow.bias = -0.0002
  sun.shadow.radius = 3
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#7aafff', 0.55)
  fill.position.set(18, 10, -12)
  scene.add(fill)
  const groundMat = new THREE.MeshStandardMaterial({ color: '#e4e8e1', roughness: 1, dithering: true })
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.38
  ground.receiveShadow = true
  scene.add(ground)

  let seed = 512
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  // The plan follows the geography: every bank gets its own grid, and the three bridges join them.
  const plan = planCity(RESERVED, insideLand)
  const kit = new Kit(scene)
  const lots: Lot[] = []
  const familySequence: Partial<Record<Family, number>> = {}
  const lowRise: Family[] = ['Laneway shop', 'Bluestone warehouse', 'Victorian terrace']
  plan.parcels.forEach((parcel) => {
    const nearRiver = Math.abs(parcel.z - riverAt(parcel.x).z) < 1.9
    const choices = FAMILY_CHOICES[parcel.district] ?? FAMILY_CHOICES['Hoddle Grid']
    const family = nearRiver ? lowRise[Math.floor(rand() * lowRise.length)] : choices[Math.floor(rand() * choices.length)]
    const height = nearRiver ? 0.7 + rand() * 0.5 : heightFor(family, parcel.district, rand())
    const variant = familySequence[family] ?? 0
    familySequence[family] = variant + 1
    kit.at(parcel.x, parcel.z, 0.58, parcel.rot)
    building(kit, family, parcel.w, parcel.d, height, variant)
    lots.push({ ...parcel, height, family, variant })
  })

  const landmarkLots = LANDMARKS.map((site) => {
    LANDMARK_BUILDERS[site.id](kit, site.x, site.z)
    return {
      x: site.x,
      z: site.z,
      w: LANDMARK_ENVELOPES[site.id].w,
      d: LANDMARK_ENVELOPES[site.id].d,
      height: LANDMARK_ENVELOPES[site.id].maxY + 0.6,
    }
  })
  kit.finish()

  const rotated = (x: number, z: number, w: number, d: number, rot: number, height: number): Footprint => {
    const c = Math.abs(Math.cos(rot)),
      s = Math.abs(Math.sin(rot))
    return { x, z, w: w * c + d * s, d: w * s + d * c, height }
  }
  const footprints: Footprint[] = [
    ...lots.map((lot) => rotated(lot.x, lot.z, lot.w, lot.d, lot.rot, 0.62 + lot.height)),
    ...landmarkLots,
  ]
  const urban = buildEnvironment(scene, plan, footprints)
  const life = addCityLife(scene, plan.network, urban.walks)

  const blockers = footprints.map(
    (b) =>
      new THREE.Box3(
        new THREE.Vector3(b.x - b.w / 2 - 0.05, 0.58, b.z - b.d / 2 - 0.05),
        new THREE.Vector3(b.x + b.w / 2 + 0.05, b.height + 0.12, b.z + b.d / 2 + 0.05),
      ),
  )
  const cameraPrevious = camera.position.clone(),
    guardCamera = createCameraGuard(blockers)

  container.dataset.landmarks = JSON.stringify(LANDMARKS)
  container.dataset.buildings = String(lots.length + LANDMARKS.length)
  container.dataset.roadEdges = String(plan.network.edges.length)
  container.dataset.vehicles = String(life.vehicles.length)
  container.dataset.pedestrians = String(life.people.length)
  container.dataset.boats = String(life.boats.length)
  container.dataset.buildingLots = JSON.stringify(
    lots.map((l) => ({ x: l.x, z: l.z, w: l.w, d: l.d, h: l.height, family: l.family, district: l.district })),
  )
  container.dataset.families = JSON.stringify([...new Set(lots.map((l) => l.family))])
  container.dataset.plan = JSON.stringify({
    nodes: plan.network.nodes.length,
    edges: plan.network.edges.length,
    parcels: plan.parcels.length,
    bridges: plan.bridges,
    components: 1,
  })
  container.dataset.landmarkPlacements = JSON.stringify(landmarkLots.map((l) => ({ ...l })))

  const facts: CityFacts = {
    roadEdges: plan.network.edges.length,
    vehicles: life.vehicles.length,
    pedestrians: life.people.length,
    boats: life.boats.length,
    buildings: lots.length + LANDMARKS.length,
    triangles: 0,
    drawCalls: 0,
  }

  const TRANSITION_SECONDS = options.reducedMotion ? 0 : 1.4
  let night = 0,
    targetNight = 0,
    simTime = 0,
    frames = 0,
    disposed = false,
    cameraClear = true
  let transition: {
    from: THREE.Vector3
    to: THREE.Vector3
    targetFrom: THREE.Vector3
    targetTo: THREE.Vector3
    elapsed: number
    arc: boolean
    duration: number
  } | null = null
  controls.addEventListener('start', () => {
    transition = null
  })
  const bg = dayBg.clone()
  let lastShadow = -1
  const smooth = (v: number) => {
    const u = THREE.MathUtils.clamp(v, 0, 1)
    return u * u * (3 - 2 * u)
  }
  function applyTransition(dt: number) {
    if (!transition) return
    transition.elapsed += dt
    const t = transition.duration > 0 ? Math.min(transition.elapsed / transition.duration, 1) : 1,
      ease = t * t * (3 - 2 * t)
    if (transition.arc && t < 1) {
      const clearance = Math.max(
        transition.from.y,
        transition.to.y,
        ...blockers.map((box) => box.max.y + 2),
      )
      camera.position.lerpVectors(transition.from, transition.to, ease)
      camera.position.y =
        t < 0.28
          ? THREE.MathUtils.lerp(transition.from.y, clearance, smooth(t / 0.28))
          : t > 0.72
            ? THREE.MathUtils.lerp(clearance, transition.to.y, smooth((t - 0.72) / 0.28))
            : clearance
    } else {
      camera.position.lerpVectors(transition.from, transition.to, ease)
    }
    controls.target.lerpVectors(transition.targetFrom, transition.targetTo, ease)
    if (t === 1) transition = null
  }
  function tick(dt: number) {
    if (disposed) return
    simTime += dt
    night = options.reducedMotion ? targetNight : THREE.MathUtils.damp(night, targetNight, 1.8, dt)
    if (Math.abs(night - targetNight) < 1e-4) night = targetNight
    bg.copy(dayBg).lerp(nightBg, night)
    scene.background = bg
    ;(scene.fog as THREE.Fog).color.copy(bg)
    hemi.intensity = 1.4 - 0.55 * night
    sun.intensity = 2.35 - 2.0 * night
    sun.color.set('#fff2d2').lerp(new THREE.Color('#8fa8d8'), night)
    fill.intensity = 0.55 + 1.05 * night
    renderer.toneMappingExposure = 1.12 + 0.12 * night
    scene.environmentIntensity = 0.62 - 0.28 * night
    groundMat.color.set('#e4e8e1').lerp(new THREE.Color('#1a2838'), night)
    kit.update(night)
    urban.update(simTime, night)
    life.update(dt, simTime, night)
    applyTransition(dt)
    controls.target.y = Math.max(0.55, controls.target.y)
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -13, 13)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -10, 10)
    controls.update(dt)
    if (guardCamera(cameraPrevious, camera.position)) transition = null
    cameraPrevious.copy(camera.position)
    cameraClear = !blockers.some((box) => box.containsPoint(camera.position))
    if (lastShadow < 0 || simTime - lastShadow >= 1 / 12) {
      renderer.shadowMap.needsUpdate = true
      lastShadow = simTime
    }
    renderer.render(scene, camera)
    if (frames++ === 0) {
      facts.triangles = renderer.info.render.triangles
      facts.drawCalls = renderer.info.render.calls
      options.onFrame()
    }
  }
  function resize() {
    const w = container.clientWidth,
      h = container.clientHeight
    if (!w || !h) return
    camera.aspect = w / h
    if (options.viewOffset() && w > 850) camera.setViewOffset(w, h, -Math.min(150, w * 0.105), 0, w, h)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()
  let fpsCount = 0,
    fpsStart = -1,
    last = -1,
    raf = 0
  function loop(now: number) {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    const dt = last < 0 ? 1 / 60 : Math.min((now - last) / 1000, 0.05)
    last = now
    tick(dt)
    if (fpsStart < 0) fpsStart = now
    fpsCount++
    if (now - fpsStart > 2000) {
      container.dataset.fps = String(Math.round((fpsCount * 1000) / (now - fpsStart)))
      fpsCount = 0
      fpsStart = now
    }
  }
  if (options.live) raf = requestAnimationFrame(loop)

  function settleControls() {
    const damping = controls.enableDamping,
      rotate = controls.autoRotate
    controls.autoRotate = false
    controls.enableDamping = false
    controls.update()
    controls.enableDamping = damping
    controls.autoRotate = rotate
  }
  function move(to: THREE.Vector3, target: THREE.Vector3, arc = false) {
    settleControls()
    if (arc) controls.autoRotate = false
    transition = {
      from: camera.position.clone(),
      to,
      targetFrom: controls.target.clone(),
      targetTo: target,
      elapsed: 0,
      arc,
      duration: TRANSITION_SECONDS,
    }
    if (TRANSITION_SECONDS === 0) {
      applyTransition(0)
      controls.update()
      cameraPrevious.copy(camera.position)
    }
  }
  const offset = new THREE.Vector3(),
    spherical = new THREE.Spherical()

  return {
    tick,
    facts,
    state: () => {
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target))
      return {
        azimuth: spherical.theta,
        polar: spherical.phi,
        distance: spherical.radius,
        target: controls.target.toArray() as [number, number, number],
        night,
        targetNight: targetNight as 0 | 1,
        rotating: controls.autoRotate,
        transition: transition !== null,
        cameraClear,
        time: simTime,
      }
    },
    setNight: (v) => {
      targetNight = v ? 1 : 0
      if (options.reducedMotion) night = targetNight
    },
    setRotate: (v) => (controls.autoRotate = v),
    reset: () => move(initial.clone(), initialTarget.clone(), true),
    home: () => {
      settleControls()
      transition = null
      controls.autoRotate = false
      camera.position.copy(initial)
      controls.target.copy(initialTarget)
      controls.update()
      cameraPrevious.copy(camera.position)
      targetNight = 0
      night = 0
    },
    focus: (i) => {
      const site = LANDMARKS[i]
      const target = new THREE.Vector3(site.x, site.look, site.z)
      move(target.clone().add(new THREE.Vector3(...site.offset)), target, true)
    },
    zoom: (factor) => {
      const current = camera.position.clone().sub(controls.target)
      current.multiplyScalar(factor)
      current.clampLength(3, 76)
      move(controls.target.clone().add(current), controls.target.clone())
    },
    orbitBy: (dTheta, dPhi) => {
      settleControls()
      transition = null
      spherical.setFromVector3(offset.copy(camera.position).sub(controls.target))
      spherical.theta += dTheta
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + dPhi, controls.minPolarAngle, controls.maxPolarAngle)
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical))
      controls.update()
      cameraPrevious.copy(camera.position)
    },
    panBy: (dx, dz) => {
      settleControls()
      transition = null
      offset.set(dx, 0, dz)
      controls.target.add(offset)
      camera.position.add(offset)
      controls.update()
      cameraPrevious.copy(camera.position)
    },
    screenshot: () => {
      renderer.render(scene, camera)
      return renderer.domElement.toDataURL('image/png')
    },
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer.disconnect()
      controls.dispose()
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose()
          const mats = Array.isArray(o.material) ? o.material : [o.material]
          mats.forEach((m) => m.dispose())
        }
      })
      environment.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
