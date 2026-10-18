import enCommon from './locales/en/common'
import enAuth from './locales/en/auth'
import enOnboarding from './locales/en/onboarding'
import enTasks from './locales/en/tasks'
import enHabits from './locales/en/habits'
import enBrain from './locales/en/brain'
import enCalendar from './locales/en/calendar'
import enDashboards from './locales/en/dashboards'
import enSettings from './locales/en/settings'
import ptCommon from './locales/pt-BR/common'
import ptAuth from './locales/pt-BR/auth'
import ptOnboarding from './locales/pt-BR/onboarding'
import ptTasks from './locales/pt-BR/tasks'
import ptHabits from './locales/pt-BR/habits'
import ptBrain from './locales/pt-BR/brain'
import ptCalendar from './locales/pt-BR/calendar'
import ptDashboards from './locales/pt-BR/dashboards'
import ptSettings from './locales/pt-BR/settings'

export const en = {
  common: enCommon,
  auth: enAuth,
  onboarding: enOnboarding,
  tasks: enTasks,
  habits: enHabits,
  brain: enBrain,
  calendar: enCalendar,
  dashboards: enDashboards,
  settings: enSettings,
}

export const resources = {
  en,
  'pt-BR': {
    common: ptCommon,
    auth: ptAuth,
    onboarding: ptOnboarding,
    tasks: ptTasks,
    habits: ptHabits,
    brain: ptBrain,
    calendar: ptCalendar,
    dashboards: ptDashboards,
    settings: ptSettings,
  },
}

export const namespaces = Object.keys(en) as (keyof typeof en)[]
