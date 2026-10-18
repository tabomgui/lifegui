// Nomes vêm do namespace onboarding (suggestions.categories.*/suggestions.habits.*),
// traduzidos no idioma ativo; aqui só a identidade estável (key) e os dados visuais/alvo.
// Ícones precisam existir no ICON_MAP de components/icon.tsx; cores da paleta dos dialogs.
export const CATEGORY_SUGGESTIONS = [
  { key: 'work', icon: 'briefcase', color: '#3b82f6' },
  { key: 'personal', icon: 'user', color: '#8b5cf6' },
  { key: 'studies', icon: 'graduation-cap', color: '#f59e0b' },
  { key: 'home', icon: 'home', color: '#10b981' },
  { key: 'health', icon: 'heart-pulse', color: '#ef4444' },
] as const

export const HABIT_SUGGESTIONS = [
  { key: 'read', icon: 'book-open', color: '#3b82f6', target_per_week: 7 },
  { key: 'exercise', icon: 'dumbbell', color: '#ef4444', target_per_week: 3 },
  { key: 'meditate', icon: 'brain', color: '#8b5cf6', target_per_week: 5 },
  { key: 'water', icon: 'droplet', color: '#10b981', target_per_week: 7 },
] as const

export type CategorySuggestion = (typeof CATEGORY_SUGGESTIONS)[number]
export type HabitSuggestion = (typeof HABIT_SUGGESTIONS)[number]

// Comparação de nomes (já traduzidos) para não sugerir de novo o que já existe.
export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}
