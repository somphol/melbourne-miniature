export declare const LANGS: readonly string[]
export type Lang = 'en' | 'vi'
export declare function normLang(value: unknown): Lang
export declare function parseParams(search: string): {
  lang: Lang
  embed: boolean
  quality: 'low' | 'high' | null
  capture: boolean
}
