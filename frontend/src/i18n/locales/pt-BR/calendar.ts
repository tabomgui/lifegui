import type en from '../en/calendar'
import type { Messages } from '../../types'

export default {
  connect: {
    heading: 'Conecte seu Google Calendar',
    description:
      'A agenda mostra seu calendário Google ao vivo e deixa você agendar notas, hábitos e tarefas nele. Nada fica copiado no lifegui.',
    button: 'Conectar Google Calendar',
  },
  credentialsHint: {
    text: 'Requer credenciais do Google nesta instância.',
    link: 'Como configurar',
  },
  filters: {
    task: 'Tarefas',
    habit: 'Hábitos',
    note: 'Notas',
    event: 'Eventos',
    external: 'Pessoais',
  },
  types: {
    task: 'Tarefa',
    habit: 'Hábito',
    note: 'Nota',
    event: 'Evento',
    external: 'Evento pessoal',
  },
  newButton: 'Novo',
  recurring: 'Recorrente',
  googleLink: 'Google',
  openItem: 'Abrir {{type}}',
  remove: 'Remover',
  scope: {
    series: 'Toda a série',
    occurrence: 'Só esta ocorrência',
  },
  dateLabel: 'Data',
  timeLabel: 'Hora',
  durationLabel: 'Duração (min)',
  startingLabel: 'A partir de',
  weekdaysLabel: 'Dias da semana',
  titleLabel: 'Título',
  eventTitleLabel: 'Título do evento',
  choosePlaceholder: 'Escolher…',
  repeatWeekly: 'Repetir semanalmente',
  studyNote: 'Estudar: {{title}}',
  scheduleButton: 'Agendar',
  connectShort: 'Conectar calendário',
  createDialog: {
    title: 'Novo na agenda',
  },
  editDialog: {
    title: 'Editar evento',
  },
  scheduleDialog: {
    title: 'Agendar no calendário',
  },
  scheduleSection: {
    label: 'Agenda',
    recurring: 'Toda {{days}} · {{time}}',
    recurringFallback: 'Toda semana · {{time}}',
    removeAria: 'Remover do calendário',
  },
  toast: {
    moveError: 'Não foi possível mover o evento',
    seriesDeleted: 'Série removida',
    removed: 'Removido do calendário',
    removeError: 'Não foi possível remover',
    created: 'Criado no Google Calendar',
    createError: 'Não foi possível criar',
    connectRequired: 'Conecte o Google Calendar em Configurações',
    saveError: 'Não foi possível salvar',
    seriesUpdated: 'Série atualizada',
    eventUpdated: 'Evento atualizado',
    scheduled: 'Agendado no Google Calendar',
    scheduleError: 'Não foi possível agendar',
  },
} satisfies Messages<typeof en>
