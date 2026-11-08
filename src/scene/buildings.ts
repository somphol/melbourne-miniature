import { Kit, clipped, gable, loft, rect, type Kind } from './kit'
import type { Point } from './geo'

export type Family =
  | 'Victorian terrace'
  | 'Bluestone warehouse'
  | 'Glass office'
  | 'Art Deco apartment'
  | 'Brick walk-up'
  | 'Laneway shop'
  | 'Riverside apartment'
  | 'Institution'
  | 'Hotel tower'

export const FAMILIES: Family[] = [
  'Victorian terrace',
  'Bluestone warehouse',
  'Glass office',
  'Art Deco apartment',
  'Brick walk-up',
  'Laneway shop',
  'Riverside apartment',
  'Institution',
  'Hotel tower',
]

const BRICK = ['#a95f4b', '#b8745c', '#8f4f3e', '#c08a6a', '#9c6a55']
const CREAM = '#e6dcc3'
const TRIM = '#f1e9d5'
const GLASS = ['#4b8295', '#3f7182', '#5b8b9b', '#366879']

function basePlinth(k: Kit, w: number, d: number, color = '#cfc5ae') {
  k.solid(rect(w + 0.016, d + 0.016), 0, 0.1, color)
  k.band(rect(w + 0.016, d + 0.016), 0.1, 0.02, 0.025, TRIM)
}

function parapet(k: Kit, w: number, d: number, y: number, color = TRIM) {
  k.solid(rect(w + 0.018, d + 0.018), y, 0.055, color)
  k.band(rect(w, d), y + 0.058, 0.026, 0.02, '#bfb49b')
}

function chimney(k: Kit, x: number, y: number, z: number, color = '#8b5a49') {
  k.box(x, y, z, 0.055, 0.18, 0.055, color)
  k.box(x, y + 0.1, z, 0.07, 0.022, 0.07, '#c9bda5')
}

function victorian(k: Kit, w: number, d: number, h: number, variant: number) {
  const brick = BRICK[variant % BRICK.length]
  basePlinth(k, w, d)
  k.solid(rect(w, d), 0.1, h - 0.1, brick)
  k.windows(rect(w, d), 0.32, h - 0.36, 'residential', 0.16, 0.2)
  k.band(rect(w, d), 0.52, 0.018, 0.022, CREAM)
  k.band(rect(w, d), h - 0.06, 0.02, 0.028, CREAM)
  // Upper-storey iron-lace balcony on the street face.
  if (h > 0.8) {
    k.balcony(0, 0.6, d / 2 + 0.075, w * 0.82, 0.14, CREAM)
    k.box(0, 0.95, d / 2 + 0.07, w * 0.9, 0.04, 0.12, CREAM)
  }
  if (variant % 2 === 0) {
    parapet(k, w, d, h, CREAM)
    chimney(k, -w * 0.3, h + 0.16, -d * 0.2, brick)
  } else {
    gable(k, w + 0.02, d + 0.02, h, 0.24, '#6b655a')
    // Projecting bay window with its own little gable.
    k.box(w * 0.24, h * 0.62, d / 2 + 0.04, w * 0.36, h * 0.58, 0.08, CREAM)
    k.box(w * 0.24, h * 0.64, d / 2 + 0.085, w * 0.26, h * 0.42, 0.018, '#6f8b95', 'glass')
    gable(k, w * 0.4, 0.1, h * 0.9, 0.1, '#6b655a', w * 0.24, d / 2 + 0.08)
    chimney(k, w * 0.32, h + 0.14, -d * 0.18, brick)
  }
  k.storefront(w * 0.9, d, '#7d8f7d')
  k.count('Victorian terrace')
}

function bluestone(k: Kit, w: number, d: number, h: number, variant: number) {
  basePlinth(k, w, d, '#7f847c')
  k.solid(rect(w, d), 0.1, h - 0.1, '#4d5a60')
  k.windows(rect(w, d), 0.34, h - 0.38, 'historic', 0.18, 0.24)
  for (let y = 0.38; y < h - 0.04; y += 0.26) k.band(rect(w, d), y, 0.02, 0.018, '#89908a')
  // Arched loading doors and a hoist beam: the riverside warehouse signature.
  k.box(0, 0.38, d / 2 + 0.012, w * 0.3, 0.5, 0.02, '#2e3d44', 'glass')
  k.box(0, 0.64, d / 2 + 0.02, w * 0.34, 0.05, 0.03, '#a9b0a5', 'metal')
  k.box(w * 0.12, h * 0.82, d / 2 + 0.08, 0.03, 0.32, 0.03, '#7e8b83', 'metal')
  if (variant % 2 === 0) {
    gable(k, w + 0.02, d + 0.02, h, 0.22, '#545f5a')
  } else {
    // Saw-tooth roof lights.
    for (let i = 0; i < 3; i++) {
      gable(k, w / 3, d + 0.02, h, 0.16, '#59635f', -w / 3 + (i * w) / 3, 0)
      k.box(-w / 3 + (i * w) / 3, h + 0.1, 0, w * 0.19, 0.02, d * 0.8, '#9eb9b8', 'glass')
    }
  }
  chimney(k, -w * 0.3, h + 0.14, -d * 0.15, '#596267')
  k.count('Bluestone warehouse')
}

function glassOffice(k: Kit, w: number, d: number, h: number, variant: number) {
  const glazing = GLASS[variant % GLASS.length]
  const p = variant % 2 ? clipped(w, d, w * 0.16) : rect(w, d)
  k.solid(rect(w + 0.02, d + 0.02), 0, 0.2, '#b8b7a9')
  k.band(rect(w + 0.02, d + 0.02), 0.2, 0.03, 0.03, '#e2ddc9')
  k.solid(p, 0.2, h - 0.2, glazing, 'glass')
  for (let y = 0.32; y < h - 0.05; y += 0.2) k.band(p, y, 0.012, 0.017, '#b9cfcd', 'metal')
  for (let y = 0.5; y < h - 0.1; y += 0.6) k.band(p, y, 0.018, 0.03, '#d8d5bd', 'windowCool')
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      k.box((sx * w) / 2, h / 2, (sz * d) / 2, 0.015, h - 0.2, 0.015, '#cbd9d4', 'metal')
    }
  }
  const top = h * 0.82
  k.solid(clipped(w * 0.72, d * 0.72, 0.07), top, h - top, glazing, 'glass')
  k.band(clipped(w * 0.72, d * 0.72, 0.07), h, 0.025, 0.03, '#dce4db', 'metal')
  k.roofKit(0, h + 0.02, 0, w * 0.5, d * 0.5, variant)
  k.count('Glass office')
}

function deco(k: Kit, w: number, d: number, h: number, variant: number) {
  const stone = ['#d9bd8e', '#e4cda4', '#cfa87a'][variant % 3]
  basePlinth(k, w, d, '#b9a78a')
  k.solid(rect(w, d), 0.1, h - 0.1, stone)
  k.windows(rect(w, d), 0.26, h - 0.3, 'deco', 0.16, 0.24)
  for (let y = 0.28; y < h - 0.04; y += 0.3) k.band(rect(w, d), y, 0.02, 0.025, '#efe0c2')
  if (variant % 2 === 0) {
    // Rounded corner tower with a vertical fin.
    k.cylinder(w / 2 - 0.055, h * 0.5, d / 2 - 0.055, 0.1, h, stone, 'stone', 0.1, 10)
    k.box(0, h + 0.09, 0, w * 0.34, 0.18, d * 0.22, '#b7a17c')
    k.box(0, h + 0.24, 0, 0.045, 0.32, 0.08, '#9f8a68')
    k.cylinder(0, h + 0.42, 0, 0.018, 0.12, '#c7c2ac', 'metal', 0.006, 6)
  } else {
    k.solid(clipped(w * 0.6, d * 0.62, 0.05), h, 0.2, '#d6c5a5')
    k.band(clipped(w * 0.6, d * 0.62, 0.05), h + 0.2, 0.02, 0.03, '#efe1c4')
    k.box(w * 0.28, h + 0.08, 0, 0.1, 0.2, d * 0.5, '#c4b291')
  }
  k.storefront(w * 0.86, d, '#8c7d68')
  k.count('Art Deco apartment')
}

function walkUp(k: Kit, w: number, d: number, h: number, variant: number) {
  const brick = variant % 2 ? '#b98b6e' : '#9d6a54'
  basePlinth(k, w, d, '#cfc4ab')
  k.solid(rect(w, d), 0.1, h - 0.1, brick)
  k.windows(rect(w, d), 0.24, h - 0.28, 'residential', 0.18, 0.2)
  for (let y = 0.45; y < h - 0.1; y += 0.38) {
    k.box(0, y, d / 2 + 0.06, w * 0.9, 0.025, 0.12, '#e3d8c1')
    k.box(0, y + 0.08, d / 2 + 0.12, w * 0.9, 0.12, 0.015, variant % 2 ? '#e9e4d4' : '#6e837d', 'metal')
    for (let i = 0; i < 4; i++) {
      k.box(-w * 0.36 + (i * w * 0.72) / 3, y + 0.04, d / 2 + 0.12, 0.008, 0.08, 0.008, '#5c6c66', 'metal')
    }
  }
  // External stair and a laundry line.
  for (let i = 0; i < 7; i++) {
    k.box(w * 0.42, 0.12 + i * 0.09, d / 2 + 0.08, 0.09, 0.02, 0.12, '#c9bea5')
  }
  k.box(w * 0.42, h * 0.5, d / 2 + 0.15, 0.012, h * 0.9, 0.012, '#6f7b73', 'metal')
  parapet(k, w, d, h, '#d7ccb4')
  for (let i = 0; i < 3; i++) {
    k.box(-w * 0.22 + i * 0.12, h + 0.08, -d * 0.22, 0.07, 0.015, 0.04, '#d8d2bd', 'metal')
  }
  k.count('Brick walk-up')
}

function lanewayShop(k: Kit, w: number, d: number, h: number, variant: number) {
  const paint = ['#7f9a8b', '#c07c5a', '#8f7f9c', '#6e8f9a'][variant % 4]
  basePlinth(k, w, d, '#c7b89c')
  k.solid(rect(w, d), 0.1, h - 0.1, paint)
  k.storefront(w, d, paint)
  k.windows(rect(w, d), 0.54, h - 0.58, 'retail', 0.13, 0.2)
  k.box(0, 0.42, d / 2 + 0.18, w * 0.98, 0.03, 0.28, variant % 2 ? '#d9b45e' : '#a94f43', 'metal')
  k.box(0, h - 0.02, d / 2 + 0.03, w * 0.72, 0.13, 0.03, '#f0e6cd')
  k.box(0, h - 0.02, d / 2 + 0.048, w * 0.58, 0.035, 0.01, paint, 'metal')
  if (variant % 2 === 0) {
    // Painted mural panel on the blind side wall.
    for (let i = 0; i < 5; i++) {
      k.box(-w / 2 - 0.008, 0.26 + i * 0.08, -d * 0.2 + (i % 2) * 0.16, 0.01, 0.05, 0.16, ['#d7a24e', '#668b8a', '#b7614f'][i % 3], 'stone')
    }
    k.box(0, h + 0.1, -d * 0.1, w * 0.8, 0.18, 0.03, '#4e5b57', 'metal')
  } else {
    k.solid(rect(w * 0.72, d * 0.7), h, 0.14, '#d7c9ae')
  }
  k.count('Laneway shop')
}

function riverside(k: Kit, w: number, d: number, h: number, variant: number) {
  const walls = variant % 2 ? '#e4e2d8' : '#d8d6c9'
  basePlinth(k, w, d, '#b8b6a8')
  k.solid(rect(w, d), 0.1, h - 0.1, walls)
  k.windows(rect(w, d), 0.24, h - 0.28, 'residential', 0.16, 0.2)
  // Stacked concrete balconies with frameless glass rails.
  for (let y = 0.42; y < h - 0.08; y += 0.32) {
    k.box(0, y, d / 2 + 0.09, w * 0.96, 0.035, 0.18, walls)
    k.box(0, y + 0.1, d / 2 + 0.17, w * 0.94, 0.14, 0.012, '#9ec0c4', 'glass')
    k.box(0, y + 0.18, d / 2 + 0.17, w * 0.96, 0.016, 0.02, '#d7d4c6', 'metal')
  }
  if (variant % 2 === 0) {
    // Rounded balcony end.
    k.cylinder(w / 2 - 0.02, h * 0.45, d / 2 - 0.02, 0.12, h * 0.8, walls, 'stone', 0.12, 12)
    k.solid(rect(w * 0.82, d * 0.82), h, 0.18, '#cdd8c9')
    for (let i = 0; i < 4; i++) {
      k.cylinder(-w * 0.3 + i * 0.18, h + 0.28, -d * 0.18, 0.055, 0.12, '#6f8d62', 'stone', 0.04, 7)
    }
  } else {
    k.solid(rect(w * 0.7, d * 0.7), h, 0.14, '#c9c6b8')
    k.box(0, h + 0.22, 0, w * 0.5, 0.03, 0.03, '#6a7d72', 'metal')
    for (let i = 0; i < 4; i++) k.box(-w * 0.18 + i * 0.12, h + 0.12, -d * 0.22, 0.01, 0.2, 0.01, '#6a7d72', 'metal')
  }
  k.roofKit(0, h + 0.02, 0, w * 0.4, d * 0.4, variant)
  k.count('Riverside apartment')
}

function institution(k: Kit, w: number, d: number, h: number, variant: number) {
  const brick = variant % 2 ? '#b06a50' : '#9a5a45'
  basePlinth(k, w, d, '#c7b99f')
  k.solid(rect(w, d), 0.1, h - 0.1, brick)
  k.windows(rect(w, d), 0.26, h - 0.3, 'historic', 0.16, 0.22)
  k.band(rect(w, d), h - 0.05, 0.025, 0.03, CREAM)
  if (variant % 2 === 0) {
    gable(k, w + 0.02, d + 0.02, h, 0.22, '#59635f')
    k.box(0, h + 0.05, d / 2 - 0.02, w * 0.22, 0.26, 0.32, CREAM)
    k.cylinder(0, h + 0.32, d / 2 - 0.02, 0.03, 0.3, '#5f6b66', 'stone', 0.008, 6)
    k.box(0, h + 0.5, d / 2 - 0.02, 0.06, 0.06, 0.06, '#c9a24a', 'accent')
  } else {
    gable(k, w * 0.42, d + 0.02, h, 0.2, '#59635f', -w * 0.26, 0)
    gable(k, w * 0.42, d + 0.02, h, 0.2, '#59635f', w * 0.26, 0)
    k.solid(rect(w * 0.26, d * 0.5), h, 0.42, brick)
    k.cylinder(0, h + 0.5, 0, 0.02, 0.32, '#c9c3ae', 'metal', 0.005, 6)
  }
  k.box(0, 0.32, d / 2 + 0.015, w * 0.2, 0.36, 0.02, '#433f36', 'glass')
  k.count('Institution')
}

function hotel(k: Kit, w: number, d: number, h: number, variant: number) {
  const pale = variant % 2 ? '#d8d9cf' : '#cfd6d2'
  basePlinth(k, w, d, '#aaa99d')
  k.solid(rect(w, d), 0.1, h - 0.1, pale)
  k.windows(rect(w, d), 0.28, h - 0.32, 'residential', 0.16, 0.2)
  for (let y = 0.4; y < h - 0.12; y += 0.28) {
    k.box(0, y, d / 2 + 0.06, w * 0.92, 0.02, 0.1, '#ece7d8')
    k.box(0, y + 0.06, d / 2 + 0.11, w * 0.9, 0.09, 0.012, variant % 2 ? '#7f9a9b' : '#9bb6b8', 'glass')
  }
  k.band(rect(w, d), h - 0.24, 0.02, 0.06, '#3f6068')
  k.solid(rect(w * 0.7, d * 0.72), h, 0.16, pale)
  k.box(0, h + 0.12, d / 2 + 0.02, w * 0.5, 0.11, 0.025, '#e0b34e', 'accent')
  k.box(0, h + 0.12, d / 2 + 0.04, w * 0.36, 0.035, 0.01, '#5b4a27', 'metal')
  for (let i = 0; i < 3; i++) {
    k.box(-w * 0.18 + i * 0.16, h + 0.28, -d * 0.16, 0.11, 0.02, 0.11, '#d9d4c2', 'metal')
  }
  k.count('Hotel tower')
}

export function building(
  k: Kit,
  family: Family,
  w: number,
  d: number,
  h: number,
  variant: number,
) {
  const glazing = GLASS[variant % GLASS.length]
  k.facade(
    glazing,
    variant % 2 ? '#70583f' : '#525f5c',
    family === 'Glass office' ? 'cool' : family === 'Bluestone warehouse' ? 'cool' : 'soft',
  )
  const f = family as Family
  if (f === 'Victorian terrace') victorian(k, w, d, h, variant)
  else if (f === 'Bluestone warehouse') bluestone(k, w, d, h, variant)
  else if (f === 'Glass office') glassOffice(k, w, d, h, variant)
  else if (f === 'Art Deco apartment') deco(k, w, d, h, variant)
  else if (f === 'Brick walk-up') walkUp(k, w, d, h, variant)
  else if (f === 'Laneway shop') lanewayShop(k, w, d, h, variant)
  else if (f === 'Riverside apartment') riverside(k, w, d, h, variant)
  else if (f === 'Institution') institution(k, w, d, h, variant)
  else hotel(k, w, d, h, variant)
}

export const FAMILY_CHOICES: Record<string, Family[]> = {
  Docklands: ['Glass office', 'Riverside apartment', 'Bluestone warehouse', 'Hotel tower'],
  'North Melbourne': ['Bluestone warehouse', 'Victorian terrace', 'Brick walk-up', 'Laneway shop'],
  'Hoddle Grid': ['Glass office', 'Art Deco apartment', 'Bluestone warehouse', 'Laneway shop', 'Hotel tower', 'Institution'],
  Carlton: ['Victorian terrace', 'Brick walk-up', 'Institution', 'Laneway shop'],
  'East Melbourne': ['Victorian terrace', 'Institution', 'Art Deco apartment', 'Brick walk-up'],
  Southbank: ['Riverside apartment', 'Glass office', 'Hotel tower', 'Brick walk-up'],
  Domain: ['Victorian terrace', 'Institution', 'Brick walk-up'],
  'Yarra Park': ['Institution', 'Brick walk-up', 'Victorian terrace'],
}

export function heightFor(family: Family, district: string, r: number) {
  const base: Record<Family, number> = {
    'Victorian terrace': 0.9 + r * 0.45,
    'Bluestone warehouse': 0.85 + r * 0.6,
    'Glass office': 1.9 + r * 1.6,
    'Art Deco apartment': 1.25 + r * 0.8,
    'Brick walk-up': 1.05 + r * 0.75,
    'Laneway shop': 0.68 + r * 0.35,
    'Riverside apartment': 1.8 + r * 1.35,
    Institution: 1.15 + r * 0.7,
    'Hotel tower': 2.2 + r * 1.6,
  }
  const factor =
    district === 'Carlton' || district === 'East Melbourne' || district === 'Domain'
      ? 0.82
      : district === 'Docklands'
        ? 0.95
        : district === 'Southbank'
          ? 1.12
          : district === 'North Melbourne'
            ? 0.8
            : district === 'Hoddle Grid'
              ? 1.22
              : 1
  return base[family] * factor
}

/** Unused helper kept type-safe: a small pitched roof for hand-authored sheds. */
export function shedRoof(k: Kit, w: number, d: number, y: number, color: string, kind: Kind = 'roof') {
  const p: Point[] = rect(w, d)
  loft(k, p, p.map(([x, z]) => [x * 0.8, z * 0.8] as Point), y, 0.12, color, kind)
}
