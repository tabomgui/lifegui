export interface CategorySuggestion {
  name: string
  icon: string
  color: string
}

export interface HabitSuggestion extends CategorySuggestion {
  target_per_week: number
}

// Ícones precisam existir no ICON_MAP de components/icon.tsx; cores da paleta dos dialogs.
export const CATEGORY_SUGGESTIONS: CategorySuggestion[] = [
  { name: 'Trabalho', icon: 'briefcase', color: '#3b82f6' },
  { name: 'Pessoal', icon: 'user', color: '#8b5cf6' },
  { name: 'Estudos', icon: 'graduation-cap', color: '#f59e0b' },
  { name: 'Casa', icon: 'home', color: '#10b981' },
  { name: 'Saúde', icon: 'heart-pulse', color: '#ef4444' },
]

export const HABIT_SUGGESTIONS: HabitSuggestion[] = [
  { name: 'Ler', icon: 'book-open', color: '#3b82f6', target_per_week: 7 },
  { name: 'Exercício', icon: 'dumbbell', color: '#ef4444', target_per_week: 3 },
  { name: 'Meditar', icon: 'brain', color: '#8b5cf6', target_per_week: 5 },
  { name: 'Beber água', icon: 'droplet', color: '#10b981', target_per_week: 7 },
]

// Comparação de nomes para não sugerir de novo o que já existe.
export function nameKey(name: string): string {
  return name.trim().toLowerCase()
}
