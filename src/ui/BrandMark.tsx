export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#1d3a35" />
      <path d="M6 21.5c3.6 0 4.4-2.4 8-2.4s4.4 2.4 12 2.4" fill="none" stroke="#d8b35e" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M9 10.5h14M9 14.5h8" stroke="#f3ecd9" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="23.5" cy="10.5" r="2.2" fill="#d8b35e" />
    </svg>
  )
}
