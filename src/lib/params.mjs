// URL parameters of the scene. Pure functions (no DOM), shared by the app and the Node tests.

export const LANGS = ['en', 'vi']

/** Maps a language tag to 'en' or 'vi'. Aliases: vi, vi-vn, vn, vietnamese. Anything else is 'en'. */
export function normLang(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
  if (s === 'vi' || s === 'vi-vn' || s === 'vn' || s === 'vietnamese') return 'vi'
  return 'en'
}

const flag = (v) => v === '1' || v === 'true'

/**
 * Parses a location.search string.
 * lang: en | vi; embed=1 hides the title area; quality=low|high forces a tier;
 * capture=1 switches to deterministic stepping.
 */
export function parseParams(search) {
  const q = new URLSearchParams(search ?? '')
  const quality = q.get('quality')
  return {
    lang: normLang(q.get('lang')),
    embed: flag(q.get('embed')),
    quality: quality === 'low' || quality === 'high' ? quality : null,
    capture: flag(q.get('capture')),
  }
}
