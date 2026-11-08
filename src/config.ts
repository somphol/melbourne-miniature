export const VERSION = '0.1.0'
export const SLUG = 'melbourne-miniature'

export type QualityTier = 'high' | 'low'
export interface QualitySettings {
  pixelRatio: number
  shadowMap: number
}
export const QUALITY: Record<QualityTier, QualitySettings> = {
  high: { pixelRatio: 1.6, shadowMap: 2048 },
  low: { pixelRatio: 1, shadowMap: 1024 },
}

export function isLikelyMobile() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 600
}

/** Stable landmark ids, in the order of the landmark bar. */
export const LANDMARK_IDS = [
  'flinders',
  'fed-square',
  'eureka',
  'arts-centre',
  'exhibition',
  'mcg',
  'st-pauls',
  'shrine',
] as const
export type LandmarkId = (typeof LANDMARK_IDS)[number]

/** strings.json key prefix of a landmark: 'fed-square' → 'lmFedSquare'. */
export const landmarkKey = (id: LandmarkId) =>
  `lm${id.replace(/(^|-)(\w)/g, (_, _d, c: string) => c.toUpperCase())}`
