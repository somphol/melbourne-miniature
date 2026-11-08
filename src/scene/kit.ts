import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Point } from './geo'

export type Kind =
  | 'stone'
  | 'glass'
  | 'window'
  | 'windowSoft'
  | 'windowCool'
  | 'metal'
  | 'copper'
  | 'accent'
  | 'crown'
  | 'roof'

type Entry = { matrix: THREE.Matrix4; color: THREE.Color }

/**
 * Instanced primitive authoring kit. Every ordinary building and landmark is drawn through one
 * Kit, so the whole city is a handful of draw calls. Boxes become per-kind InstancedMeshes;
 * custom shapes are merged per material.
 */
export class Kit {
  private boxes = new Map<Kind, Entry[]>()
  private custom = new Map<Kind, THREE.BufferGeometry[]>()
  private materialCopies: THREE.MeshStandardMaterial[] = []
  private object = new THREE.Object3D()
  private origin = new THREE.Vector3()
  private yaw = 0
  private glazing = '#426b7c'
  private frameColor = '#5f625b'
  private lightKind: Kind = 'window'
  readonly counts: Record<string, number> = {}
  readonly materials: Record<Kind, THREE.MeshStandardMaterial> = {
    stone: new THREE.MeshStandardMaterial({ roughness: 0.87, metalness: 0.02 }),
    glass: new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.4,
      side: THREE.DoubleSide,
    }),
    window: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: '#ffffff',
      emissive: '#ff9d3d',
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.24,
    }),
    windowSoft: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: '#ffffff',
      emissive: '#ffe2b1',
      emissiveIntensity: 0,
      roughness: 0.34,
      metalness: 0.18,
    }),
    windowCool: new THREE.MeshStandardMaterial({
      side: THREE.DoubleSide,
      color: '#ffffff',
      emissive: '#9ed0e8',
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0.34,
    }),
    metal: new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7 }),
    copper: new THREE.MeshStandardMaterial({ roughness: 0.56, metalness: 0.34 }),
    accent: new THREE.MeshStandardMaterial({
      color: '#d8b35e',
      emissive: '#ffcf86',
      emissiveIntensity: 0,
      roughness: 0.42,
      metalness: 0.4,
    }),
    crown: new THREE.MeshStandardMaterial({
      color: '#e8f1ed',
      roughness: 0.24,
      metalness: 0.7,
      emissive: '#93bdc8',
      emissiveIntensity: 0,
    }),
    roof: new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0.08 }),
  }

  constructor(private scene: THREE.Scene | null = null) {}

  at(x: number, z: number, y = 0.58, yaw = 0) {
    this.origin.set(x, y, z)
    this.yaw = yaw
    this.facade('#426b7c', '#5f625b', 'warm')
    return this
  }

  facade(glazing: string, frame: string, light: 'warm' | 'soft' | 'cool' = 'warm') {
    this.glazing = glazing
    this.frameColor = frame
    this.lightKind = light === 'cool' ? 'windowCool' : light === 'soft' ? 'windowSoft' : 'window'
    return this
  }

  private transform(
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    rotation = 0,
  ) {
    this.object.position
      .set(x, y, z)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw)
      .add(this.origin)
    this.object.rotation.set(0, this.yaw + rotation, 0)
    this.object.scale.set(sx, sy, sz)
    this.object.updateMatrix()
    return this.object.matrix.clone()
  }

  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    kind: Kind = 'stone',
    yaw = 0,
  ) {
    if (w <= 0 || h <= 0 || d <= 0) return
    if (!this.boxes.has(kind)) this.boxes.set(kind, [])
    this.boxes.get(kind)!.push({
      matrix: this.transform(x, y, z, w, h, d, yaw),
      color: new THREE.Color(color),
    })
  }

  geometry(geometry: THREE.BufferGeometry, color: string, kind: Kind = 'stone', x = 0, y = 0, z = 0) {
    geometry.applyMatrix4(this.transform(x, y, z))
    const col = new THREE.Color(color),
      array = new Float32Array(geometry.getAttribute('position').count * 3)
    for (let i = 0; i < array.length; i += 3) {
      array[i] = col.r
      array[i + 1] = col.g
      array[i + 2] = col.b
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(array, 3))
    if (!geometry.getAttribute('uv')) {
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((array.length / 3) * 2), 2))
    }
    if (geometry.index) {
      const nonIndexed = geometry.toNonIndexed()
      geometry.dispose()
      geometry = nonIndexed
    }
    if (!this.custom.has(kind)) this.custom.set(kind, [])
    this.custom.get(kind)!.push(geometry)
  }

  solid(points: Point[], bottom: number, h: number, color: string, kind: Kind = 'stone', bevel = 0.008) {
    const shape = new THREE.Shape()
    points.forEach(([x, z], i) => (i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)))
    shape.closePath()
    const g = new THREE.ExtrudeGeometry(shape, {
      depth: h,
      bevelEnabled: bevel > 0,
      bevelSegments: 1,
      steps: 1,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 5,
    })
    g.rotateX(-Math.PI / 2)
    this.geometry(g, color, kind, 0, bottom, 0)
  }

  band(points: Point[], y: number, width = 0.022, h = 0.03, color = '#d9cfb8', kind: Kind = 'stone') {
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        len = Math.hypot(dx, dz)
      this.box((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2, len + width, h, width, color, kind, -Math.atan2(dz, dx))
    }
  }

  beam(a: THREE.Vector3, b: THREE.Vector3, r: number, color: string, kind: Kind = 'metal') {
    const v = b.clone().sub(a)
    if (v.length() < 1e-6) return
    const g = new THREE.CylinderGeometry(r, r, v.length(), 5)
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()))
    const mid = a.clone().add(b).multiplyScalar(0.5)
    this.geometry(g, color, kind, mid.x, mid.y, mid.z)
  }

  cylinder(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: string,
    kind: Kind = 'stone',
    top = r,
    sides = 12,
  ) {
    this.geometry(new THREE.CylinderGeometry(top, r, h, sides), color, kind, x, y, z)
  }

  /** Boxes of windows on every edge of a footprint, with frames and sills. */
  windows(
    points: Point[],
    bottom: number,
    h: number,
    style: 'deco' | 'historic' | 'residential' | 'retail' = 'historic',
    spacing = 0.22,
    floor = 0.26,
  ) {
    const area = points.reduce((sum, a, i) => {
      const b = points[(i + 1) % points.length]
      return sum + a[0] * b[1] - b[0] * a[1]
    }, 0)
    const winding = area > 0 ? 1 : -1
    for (let e = 0; e < points.length; e++) {
      const a = points[e],
        b = points[(e + 1) % points.length],
        dx = b[0] - a[0],
        dz = b[1] - a[1],
        length = Math.hypot(dx, dz)
      if (length < 0.18) continue
      const nx = (dz / length) * winding,
        nz = (-dx / length) * winding,
        angle = -Math.atan2(dz, dx),
        cols = Math.max(1, Math.floor(length / spacing)),
        rows = Math.max(1, Math.floor((h - 0.08) / floor))
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const t = (col + 0.5) / cols,
            x = a[0] + dx * t,
            z = a[1] + dz * t,
            y = bottom + 0.14 + row * floor,
            w = (length / cols) * (style === 'deco' ? 0.4 : 0.55),
            hh = style === 'deco' ? floor * 0.6 : floor * 0.52
          const lit = (row * 13 + col * 7 + e * 3 + Math.floor(Math.abs(this.origin.z) * 17)) % 7 !== 0
          this.box(x + nx * 0.012, y, z + nz * 0.012, w + 0.03, hh + 0.032, 0.025, this.frameColor, 'stone', angle)
          this.box(
            x + nx * 0.026,
            y,
            z + nz * 0.026,
            w,
            hh,
            0.012,
            lit ? this.glazing : '#294e65',
            lit ? this.lightKind : 'glass',
            angle,
          )
          if (style !== 'deco') {
            this.box(x + nx * 0.043, y - hh / 2 - 0.016, z + nz * 0.043, w + 0.07, 0.024, 0.06, '#d8c9ad', 'stone', angle)
          }
        }
      }
      if (style === 'deco') {
        for (let col = 0; col <= cols; col++) {
          const t = col / cols
          this.box(
            a[0] + dx * t + nx * 0.03,
            bottom + h / 2,
            a[1] + dz * t + nz * 0.03,
            0.022,
            h,
            0.04,
            '#e1d2b4',
            'stone',
            angle,
          )
        }
      }
    }
  }

  /** A roof plant room, vents and a skylight: the ordinary flat Melbourne roof. */
  roofKit(x: number, y: number, z: number, w: number, d: number, variant = 0) {
    this.box(x - w * 0.18, y + 0.1, z - d * 0.14, 0.16, 0.2, 0.18, '#cfc7b2')
    this.box(x - w * 0.18, y + 0.21, z - d * 0.14, 0.19, 0.028, 0.21, '#b7ae99')
    this.box(x + w * 0.14, y + 0.022, z + d * 0.06, 0.15, 0.045, 0.12, '#93b6ba', 'glass')
    this.box(x + w * 0.14, y + 0.048, z + d * 0.06, 0.17, 0.01, 0.14, '#c6cfc4', 'metal')
    if (variant % 2 === 0) {
      for (let i = 0; i < 3; i++) {
        this.box(x + w * 0.02 + i * 0.08, y + 0.068, z - d * 0.2, 0.07, 0.012, 0.12, '#334e63', 'metal')
      }
    } else {
      for (let i = 0; i < 4; i++) {
        this.box(x + w * 0.02 + i * 0.065, y + 0.055, z - d * 0.18, 0.01, 0.09, 0.01, '#8f9a92', 'metal')
      }
      this.cylinder(x + w * 0.12, y + 0.08, z - d * 0.22, 0.02, 0.14, '#a9b0a6', 'metal', 0.016, 6)
    }
  }

  storefront(w: number, d: number, color = '#5c8d7f') {
    for (let i = 0; i < 3; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / 3
      this.box(x, 0.2, d / 2 + 0.022, (w / 3) * 0.78, 0.28, 0.022, '#a9bdb2', 'window')
      this.box(x, 0.36, d / 2 + 0.11, (w / 3) * 0.94, 0.06, 0.24, color, 'metal')
      this.box(x, 0.4, d / 2 + 0.23, (w / 3) * 0.94, 0.09, 0.022, color, 'metal')
      this.box(x, 0.54, d / 2 + 0.032, (w / 3) * 0.84, 0.12, 0.03, '#e7dcc5', 'stone')
    }
    this.box(0, 0.18, d / 2 + 0.05, 0.08, 0.32, 0.036, '#c6b18c', 'metal')
  }

  /** Iron-lace balcony: a slab, rail and a row of thin balusters. */
  balcony(x: number, y: number, z: number, w: number, d: number, color = '#e8dfca') {
    this.box(x, y, z, w, 0.025, d, color, 'stone')
    this.box(x, y + 0.07, z + d / 2, w, 0.016, 0.016, '#4b5b58', 'metal')
    this.box(x, y + 0.07, z - d / 2, w, 0.016, 0.016, '#4b5b58', 'metal')
    for (let i = 0; i <= 8; i++) {
      const bx = x - w / 2 + (i / 8) * w
      this.box(bx, y + 0.045, z + d / 2, 0.006, 0.06, 0.006, '#4b5b58', 'metal')
    }
    for (let i = 0; i <= 4; i++) {
      const bz = z - d / 2 + (i / 4) * d
      this.box(x - w / 2, y + 0.045, bz, 0.006, 0.06, 0.006, '#4b5b58', 'metal')
      this.box(x + w / 2, y + 0.045, bz, 0.006, 0.06, 0.006, '#4b5b58', 'metal')
    }
  }

  count(name: string) {
    this.counts[name] = (this.counts[name] ?? 0) + 1
  }

  finish() {
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
    const plane = new THREE.PlaneGeometry(1, 1)
    for (const [rawKind, entries] of this.boxes) {
      const kind = rawKind as Kind
      const m = new THREE.InstancedMesh(
        kind.startsWith('window') ? plane : boxGeometry,
        this.materials[kind],
        entries.length,
      )
      entries.forEach((entry, i) => {
        m.setMatrixAt(i, entry.matrix)
        m.setColorAt(i, entry.color)
      })
      m.castShadow = kind === 'stone' || kind === 'metal' || kind === 'roof' || kind === 'copper'
      m.receiveShadow = true
      m.computeBoundingSphere()
      if (m.instanceColor) m.instanceColor.needsUpdate = true
      this.scene?.add(m)
    }
    for (const [rawKind, geometries] of this.custom) {
      const kind = rawKind as Kind
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((g) => g.dispose())
      if (!merged) continue
      const material = this.materials[kind].clone()
      material.vertexColors = true
      const mesh = new THREE.Mesh(merged, material)
      mesh.castShadow = !kind.startsWith('window') && kind !== 'glass'
      mesh.receiveShadow = true
      material.userData.kind = kind
      this.materialCopies.push(material)
      this.scene?.add(mesh)
    }
  }

  update(night: number) {
    this.materials.window.emissiveIntensity = night * 2.0
    this.materials.windowSoft.emissiveIntensity = night * 1.6
    this.materials.windowCool.emissiveIntensity = night * 1.0
    this.materials.accent.emissiveIntensity = night * 2.4
    this.materials.crown.emissiveIntensity = night * 1.6
    for (const material of this.materialCopies) {
      const kind = material.userData.kind as Kind | undefined
      if (kind === 'window') material.emissiveIntensity = night * 2.0
      if (kind === 'windowSoft') material.emissiveIntensity = night * 1.6
      if (kind === 'windowCool') material.emissiveIntensity = night * 1.0
      if (kind === 'accent') material.emissiveIntensity = night * 2.4
      if (kind === 'crown') material.emissiveIntensity = night * 1.6
    }
  }

  /** World-space bounds of everything authored through the kit (used by the geometry tests). */
  bounds() {
    const box = new THREE.Box3()
    const temp = new THREE.Box3()
    const corner = new THREE.Vector3()
    for (const entries of this.boxes.values()) {
      for (const entry of entries) {
        temp.makeEmpty()
        for (const x of [-0.5, 0.5]) {
          for (const y of [-0.5, 0.5]) {
            for (const z of [-0.5, 0.5]) {
              corner.set(x, y, z).applyMatrix4(entry.matrix)
              temp.expandByPoint(corner)
            }
          }
        }
        box.union(temp)
      }
    }
    for (const geometries of this.custom.values()) {
      for (const g of geometries) {
        g.computeBoundingBox()
        if (g.boundingBox) box.union(g.boundingBox)
      }
    }
    return box
  }

  hasGeometry() {
    for (const entries of this.boxes.values()) if (entries.length) return true
    for (const geometries of this.custom.values()) if (geometries.length) return true
    return false
  }

  /** Total authored primitives, used by the diversity test. */
  primitiveCount() {
    let count = 0
    for (const entries of this.boxes.values()) count += entries.length
    for (const geometries of this.custom.values()) count += geometries.length
    return count
  }
}

/** A tapered square shaft with correct winding. */
export function frustum(
  k: Kit,
  bottom: number,
  top: number,
  y0: number,
  h: number,
  color: string,
  kind: Kind = 'stone',
  x = 0,
  z = 0,
) {
  const g = new THREE.CylinderGeometry(Math.max(top, 0.004) * Math.SQRT2, bottom * Math.SQRT2, h, 4, 1)
  g.rotateY(Math.PI / 4)
  k.geometry(g, color, kind, x, y0 + h / 2, z)
}

/** Gabled roof prism. `along` is the ridge axis; the default runs along the long x axis. */
export function gable(
  k: Kit,
  w: number,
  d: number,
  y: number,
  h: number,
  color: string,
  x = 0,
  z = 0,
  along: 'x' | 'z' = 'x',
) {
  if (along === 'z') {
    // Ridge along z: a triangle across x, extruded d along z.
    const s = new THREE.Shape()
    s.moveTo(-w / 2, 0)
    s.lineTo(w / 2, 0)
    s.lineTo(0, h)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false })
    g.translate(0, 0, -d / 2)
    k.geometry(g, color, 'roof', x, y, z)
    return
  }
  // Ridge along x: a triangle across d, extruded w along x.
  const s = new THREE.Shape()
  s.moveTo(-d / 2, 0)
  s.lineTo(d / 2, 0)
  s.lineTo(0, h)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false })
  g.translate(0, 0, -w / 2)
  g.rotateY(Math.PI / 2)
  k.geometry(g, color, 'roof', x, y, z)
}

/** Lofted prism between two footprints: the Federation Square / sculptural-tower mechanism. */
export function loft(
  k: Kit,
  lower: Point[],
  upper: Point[],
  bottom: number,
  height: number,
  color: string,
  kind: Kind = 'glass',
) {
  const vertices: number[] = []
  const tri = (a: number[], b: number[], c: number[]) => vertices.push(...a, ...b, ...c)
  for (let i = 0; i < lower.length; i++) {
    const j = (i + 1) % lower.length
    const a = [lower[i][0], bottom, lower[i][1]]
    const b = [lower[j][0], bottom, lower[j][1]]
    const c = [upper[j][0], bottom + height, upper[j][1]]
    const d = [upper[i][0], bottom + height, upper[i][1]]
    tri(a, c, b)
    tri(a, d, c)
  }
  for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(
    upper.map(([x, z]) => new THREE.Vector2(x, z)),
    [],
  )) {
    tri(
      [upper[a][0], bottom + height, upper[a][1]],
      [upper[c][0], bottom + height, upper[c][1]],
      [upper[b][0], bottom + height, upper[b][1]],
    )
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  g.computeVertexNormals()
  k.geometry(g, color, kind)
}

export function rect(w: number, d: number): Point[] {
  return [
    [-w / 2, -d / 2],
    [w / 2, -d / 2],
    [w / 2, d / 2],
    [-w / 2, d / 2],
  ]
}

export function clipped(w: number, d: number, c = 0.12): Point[] {
  return [
    [-w / 2 + c, -d / 2],
    [w / 2 - c, -d / 2],
    [w / 2, -d / 2 + c],
    [w / 2, d / 2 - c],
    [w / 2 - c, d / 2],
    [-w / 2 + c, d / 2],
    [-w / 2, d / 2 - c],
    [-w / 2, -d / 2 + c],
  ]
}
