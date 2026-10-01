import { createContext, useContext, useState, type ReactNode } from 'react'

type OnboardingCtx = {
  replaying: boolean
  replay: () => void
  endReplay: () => void
}

const Ctx = createContext<OnboardingCtx | null>(null)

// Passo atual do wizard: sobrevive a navegações de página inteira (ex.: OAuth do Google
// Calendar). Exportado para o onboarding-wizard não duplicar a chave.
export const STEP_STORAGE_KEY = 'lifegui:onboarding-step'
// Flag de reabertura manual ("Rever introdução"): também sobrevive a navegações de página
// inteira, pra não "perder" o replay se o usuário sair e voltar no meio do wizard.
const REPLAY_STORAGE_KEY = 'lifegui:onboarding-replay'

// Reabertura manual do wizard ("Rever introdução"), sem tocar em onboarded_at.
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [replaying, setReplaying] = useState(() => sessionStorage.getItem(REPLAY_STORAGE_KEY) === '1')

  function replay() {
    sessionStorage.setItem(REPLAY_STORAGE_KEY, '1')
    // Começa do zero: sem isso, o replay reabriria no último passo visto no primeiro uso.
    sessionStorage.removeItem(STEP_STORAGE_KEY)
    setReplaying(true)
  }

  function endReplay() {
    sessionStorage.removeItem(REPLAY_STORAGE_KEY)
    setReplaying(false)
  }

  return (
    <Ctx.Provider value={{ replaying, replay, endReplay }}>
      {children}
    </Ctx.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOnboarding deve estar dentro de OnboardingProvider')
  return ctx
}
