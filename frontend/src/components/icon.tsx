import type { CSSProperties } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Folder,
  Briefcase,
  Home,
  User,
  HeartPulse,
  Lightbulb,
  BookOpen,
  Dumbbell,
  ShoppingCart,
  Wallet,
  Plane,
  GraduationCap,
  Code,
  Music,
  Coffee,
  Target,
  Droplet,
  Moon,
  Footprints,
  PenLine,
  Sun,
  Bike,
  Salad,
  Brain,
  Sparkles,
  CircleCheck,
  Kanban,
  Repeat,
} from 'lucide-react'

// Curated set of lucide icon names available to categories and habits.
// Kept as a static map (not lucide-react/dynamic) so it stays tree-shakeable.
export const CATEGORY_ICONS: string[] = [
  'folder',
  'briefcase',
  'home',
  'user',
  'heart-pulse',
  'lightbulb',
  'book-open',
  'dumbbell',
  'shopping-cart',
  'wallet',
  'plane',
  'graduation-cap',
  'code',
  'music',
  'coffee',
  'target',
]

// Curated set of lucide icon names oriented to habits.
export const HABIT_ICONS: string[] = [
  'book-open',
  'dumbbell',
  'droplet',
  'moon',
  'footprints',
  'heart-pulse',
  'coffee',
  'pen-line',
  'sun',
  'bike',
  'salad',
  'brain',
  'music',
  'sparkles',
  'target',
  'circle-check',
]

const ICON_MAP: Record<string, LucideIcon> = {
  folder: Folder,
  briefcase: Briefcase,
  home: Home,
  user: User,
  'heart-pulse': HeartPulse,
  lightbulb: Lightbulb,
  'book-open': BookOpen,
  dumbbell: Dumbbell,
  'shopping-cart': ShoppingCart,
  wallet: Wallet,
  plane: Plane,
  'graduation-cap': GraduationCap,
  code: Code,
  music: Music,
  coffee: Coffee,
  target: Target,
  droplet: Droplet,
  moon: Moon,
  footprints: Footprints,
  'pen-line': PenLine,
  sun: Sun,
  bike: Bike,
  salad: Salad,
  brain: Brain,
  sparkles: Sparkles,
  'circle-check': CircleCheck,
  kanban: Kanban,
  repeat: Repeat,
}

const DEFAULT_ICON = Folder

export function DynamicIcon({
  name,
  className,
  style,
}: {
  name: string
  className?: string
  style?: CSSProperties
}) {
  const Icon = ICON_MAP[name] ?? DEFAULT_ICON
  return <Icon className={className} style={style} />
}
