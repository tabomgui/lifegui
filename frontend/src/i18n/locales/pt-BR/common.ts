import type en from '../en/common'
import type { Messages } from '../../types'

export default {
  language: {
    label: 'Idioma',
    en: 'English',
    'pt-BR': 'Português (Brasil)',
  },
  actions: {
    add: 'Adicionar',
    save: 'Salvar',
    cancel: 'Cancelar',
    delete: 'Excluir',
    edit: 'Editar',
    create: 'Criar',
    close: 'Fechar',
    back: 'Voltar',
    continue: 'Continuar',
    copy: 'Copiar',
    undo: 'Desfazer',
  },
  states: {
    loading: 'Carregando…',
    error: 'Algo deu errado',
  },
  nav: {
    tasks: 'Tarefas',
    habits: 'Hábitos',
    brain: 'Cérebro',
    calendar: 'Agenda',
    dashboards: 'Dashboards',
    settings: 'Configurações',
    docs: 'Documentação',
    logout: 'Sair',
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    toggleTheme: 'Alternar tema',
  },
  period: {
    '7d': '7 dias',
    '30d': '30 dias',
    '90d': '90 dias',
    '365d': '1 ano',
  },
} satisfies Messages<typeof en>
