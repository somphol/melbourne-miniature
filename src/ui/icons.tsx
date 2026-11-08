import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 16, strokeWidth = 1.7, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export function Sun(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </Icon>
  )
}
export function Moon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </Icon>
  )
}
export function RotateCw(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 5v6h-6" />
    </Icon>
  )
}
export function RotateCcw(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 11a8 8 0 1 1 2.3 6" />
      <path d="M4 5v6h6" />
    </Icon>
  )
}
export function Plus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}
export function Minus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}
export function X(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}
export function Camera(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 8h3l1.5-2h7L17 8h3v11H4Z" />
      <circle cx="12" cy="13" r="3.2" />
    </Icon>
  )
}
export function Maximize(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5" />
    </Icon>
  )
}
export function MapPin(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Icon>
  )
}
export function MousePointer2(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 3 6.5 17 2.2-6.6L20 11Z" />
    </Icon>
  )
}
export function Compass(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </Icon>
  )
}
export function ArrowUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </Icon>
  )
}
export function MoveUpRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 18 18 6M9 6h9v9" />
    </Icon>
  )
}
