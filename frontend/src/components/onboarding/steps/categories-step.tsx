import { useState } from 'react'
import type * as React from 'react'
import { toast } from 'sonner'
import { useCategories, useCreateCategory } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StepHeader } from '@/components/onboarding/step-header'
import { SuggestionChip } from '@/components/onboarding/suggestion-chip'
import { CATEGORY_SUGGESTIONS, nameKey } from '@/components/onboarding/suggestions'

export function CategoriesStep() {
  const { data: categories = [] } = useCategories()
  const create = useCreateCategory()
  const [custom, setCustom] = useState('')
  const existing = new Set(categories.map((c) => nameKey(c.name)))

  async function add(name: string, icon: string, color: string): Promise<boolean> {
    try {
      await create.mutateAsync({ name, icon, color })
      return true
    } catch {
      toast.error(`Não foi possível criar "${name}"`)
      return false
    }
  }

  async function onCustom(e: React.FormEvent) {
    e.preventDefault()
    const name = custom.trim()
    if (!name || existing.has(nameKey(name))) return
    if (await add(name, 'folder', '#64748b')) setCustom('')
  }

  return (
    <div className="space-y-4">
      <StepHeader
        title="Categorias de tarefas"
        description="Cada categoria vira uma aba do quadro de tarefas. Toque para adicionar."
      />
      <div className="flex flex-wrap gap-2">
        {CATEGORY_SUGGESTIONS.map((s) => (
          <SuggestionChip
            key={s.name}
            label={s.name}
            icon={s.icon}
            color={s.color}
            added={existing.has(nameKey(s.name))}
            disabled={create.isPending}
            onAdd={() => add(s.name, s.icon, s.color)}
          />
        ))}
      </div>
      <form onSubmit={onCustom} className="flex gap-2">
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Outra categoria" maxLength={255} />
        <Button type="submit" variant="outline" disabled={!custom.trim() || create.isPending}>
          Adicionar
        </Button>
      </form>
      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground">{categories.length} categoria(s) no quadro.</p>
      )}
    </div>
  )
}
