import { parseParams, type Lang } from './lib/params.mjs'
import STRINGS from './i18n/strings.json'

export type Strings = (typeof STRINGS)['en']
export type { Lang }

export const params = parseParams(typeof window === 'undefined' ? '' : window.location.search)
export const lang: Lang = params.lang
export const t: Strings = STRINGS[lang]

/** Debug-only starting viewpoint (?view=…); ignored in capture mode. */
export const view: string | null =
  typeof window === 'undefined' || params.capture
    ? null
    : new URLSearchParams(window.location.search).get('view')

/** Camera cuts instead of flights and an instant day/night switch; traffic keeps moving. */
export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Downloads, pop-ups and fullscreen are blocked in the Lab sandbox; hide those controls there. */
export const restricted =
  typeof window !== 'undefined' &&
  (params.embed || window.parent !== window || window.origin === 'null')

if (typeof document !== 'undefined') {
  document.documentElement.lang = lang
  document.title = t.title
}
