import * as THREE from 'three'

/**
 * Keeps a camera out of the building envelopes. It sweeps the segment travelled since the last
 * frame and, if that enters a box, stops just before the face; a camera already inside a box is
 * pushed out through the nearest face. Returns true when it corrected the position.
 */
export function createCameraGuard(boxes: THREE.Box3[]) {
  const ray = new THREE.Ray(),
    direction = new THREE.Vector3(),
    hit = new THREE.Vector3()
  return (previous: THREE.Vector3, position: THREE.Vector3) => {
    let blocked = false
    position.y = Math.max(0.85, position.y)
    direction.copy(position).sub(previous)
    const travel = direction.length()
    if (travel > 1e-5) {
      ray.set(previous, direction.normalize())
      let nearest = travel
      for (const box of boxes) {
        if (box.containsPoint(previous)) continue
        if (ray.intersectBox(box, hit)) nearest = Math.min(nearest, hit.distanceTo(previous))
      }
      if (nearest < travel) {
        position.copy(previous).addScaledVector(direction, Math.max(0, nearest - 0.07))
        blocked = true
      }
    }
    for (const box of boxes) {
      if (!box.containsPoint(position)) continue
      const faces = [
        { d: position.x - box.min.x, axis: 'x' as const, value: box.min.x - 0.05 },
        { d: box.max.x - position.x, axis: 'x' as const, value: box.max.x + 0.05 },
        { d: position.z - box.min.z, axis: 'z' as const, value: box.min.z - 0.05 },
        { d: box.max.z - position.z, axis: 'z' as const, value: box.max.z + 0.05 },
        { d: box.max.y - position.y, axis: 'y' as const, value: box.max.y + 0.06 },
      ].sort((a, b) => a.d - b.d)
      position[faces[0].axis] = faces[0].value
      blocked = true
    }
    return blocked
  }
}
