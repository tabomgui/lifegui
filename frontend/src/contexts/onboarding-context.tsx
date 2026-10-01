import { createContext, useContext, useState, type ReactNode } from 'react'

type OnboardingCtx = {
  replaying: boolean
  replay: () => void
  endReplay: () => void
}

const Ctx = createContext<OnboardingCtx | null>(null)

// Reabertura manual do wizard ("Rever introdução"), sem tocar em onboarded_at.
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [replaying, setReplaying] = useState(false)
  return (
    <Ctx.Provider value={{ replaying, replay: () => setReplaying(true), endReplay: () => setReplaying(false) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useOnboarding() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useOnboarding deve estar dentro de OnboardingProvider')
  return ctx
}
