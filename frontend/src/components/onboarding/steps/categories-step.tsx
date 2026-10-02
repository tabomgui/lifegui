import { useState } from 'react'
import type * as React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useCategories, useCreateCategory } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StepHeader } from '@/components/onboarding/step-header'
import { SuggestionChip } from '@/components/onboarding/suggestion-chip'
import { CATEGORY_SUGGESTIONS, nameKey } from '@/components/onboarding/suggestions'

export function CategoriesStep() {
  const { t } = useTranslation(['onboarding'])
  const { data: categories = [], isSuccess } = useCategories()
  const create = useCreateCategory()
  const [custom, setCustom] = useState('')
  const existing = new Set(categories.map((c) => nameKey(c.name)))
  const customKey = nameKey(custom)

  async function add(name: string, icon: string, color: string): Promise<boolean> {
    try {
      await create.mutateAsync({ name, icon, color })
      return true
    } catch {
      toast.error(t('errors.createFailed', { name }))
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
      <StepHeader title={t('categories.title')} description={t('categories.description')} />
      <div className="flex flex-wrap gap-2">
        {CATEGORY_SUGGESTIONS.map((s) => {
          // Nome traduzido é o valor enviado à API e a base da comparação de "já adicionado".
          const label = t(`suggestions.categories.${s.key}`)
          return (
            <SuggestionChip
              key={s.key}
              label={label}
              icon={s.icon}
              color={s.color}
              added={existing.has(nameKey(label))}
              disabled={create.isPending || !isSuccess}
              onAdd={() => add(label, s.icon, s.color)}
            />
          )
        })}
      </div>
      <form onSubmit={onCustom} className="flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder={t('categories.customPlaceholder')}
          maxLength={255}
        />
        <Button
          type="submit"
          variant="outline"
          disabled={!custom.trim() || create.isPending || !isSuccess || existing.has(customKey)}
        >
          {t('actions.add')}
        </Button>
      </form>
      {categories.length > 0 && (
        <p className="text-xs text-muted-foreground">{t('categories.count', { count: categories.length })}</p>
      )}
    </div>
  )
}
