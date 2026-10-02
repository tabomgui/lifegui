import type en from '../en/onboarding'
import type { Messages } from '../../types'

export default {
  dialog: {
    title: 'Configuração inicial',
    description: 'Passo {{current}} de {{total}}: {{step}}',
  },
  steps: {
    welcome: 'Início',
    modules: 'Módulos',
    categories: 'Categorias',
    habits: 'Hábitos',
    integrations: 'Integrações',
    done: 'Pronto',
  },
  actions: {
    skip: 'Pular configuração',
    start: 'Começar',
    add: 'Adicionar',
  },
  errors: {
    finish: 'Não foi possível concluir. Tente de novo.',
    createFailed: 'Não foi possível criar "{{name}}"',
  },
  welcome: {
    title: 'Boas-vindas',
    titleWithName: 'Boas-vindas, {{name}}',
    description:
      'O lifegui reúne tarefas, hábitos, notas e agenda num lugar só. Em poucos passos você escolhe o que usar e já começa com tudo pronto.',
  },
  modules: {
    title: 'Escolha seus módulos',
    description: 'Ative só o que fizer sentido agora. Dá pra mudar depois em Configurações.',
    loadError: 'Não foi possível carregar os módulos.',
    toggleLabel: 'Ativar {{label}}',
    enableError: 'Não foi possível ativar {{label}}',
    disableError: 'Não foi possível desativar {{label}}',
    vaultError: 'Cérebro ativado, mas o vault não foi criado. Tente de novo em Configurações.',
  },
  categories: {
    title: 'Categorias de tarefas',
    description: 'Cada categoria vira uma aba do quadro de tarefas. Toque para adicionar.',
    customPlaceholder: 'Outra categoria',
    count_one: '{{count}} categoria(s) no quadro.',
    count_other: '{{count}} categoria(s) no quadro.',
  },
  habits: {
    title: 'Hábitos',
    description: 'Escolha alguns para começar e ajuste a meta semanal.',
    timesPerWeek: '{{count}}x/sem',
    decreaseTarget: 'Diminuir meta',
    increaseTarget: 'Aumentar meta',
    added: 'Adicionado',
  },
  integrations: {
    title: 'Integrações',
    description: 'Opcionais. Dá pra configurar depois em Configurações.',
    calendarTitle: 'Google Calendar',
    calendarDescription: 'Agende tarefas, hábitos e estudos direto na sua agenda.',
    connected: 'Conectado',
    connectCalendar: 'Conectar Google Calendar',
    mcpTitle: 'Assistentes de IA (MCP)',
    mcpDescription: 'Conecte o claude.ai, o Claude Code ou o ChatGPT para conversar com suas tarefas, hábitos e notas.',
    urlCopied: 'URL copiada',
    copyError: 'Não foi possível copiar',
    mcpHint: 'No claude.ai, adicione um conector personalizado com esta URL. No Claude Code:',
  },
  done: {
    title: 'Tudo pronto',
    modulesActive: 'Módulos ativos: {{modules}}.',
    noModules: 'nenhum',
    categoriesCount_one: '{{count}} categoria(s) de tarefas',
    categoriesCount_other: '{{count}} categoria(s) de tarefas',
    habitsCount_one: '{{count}} hábito(s)',
    habitsCount_other: '{{count}} hábito(s)',
  },
  settingsCard: {
    title: 'Introdução',
    description: 'Reabra o assistente de configuração inicial.',
    replay: 'Rever introdução',
  },
  suggestions: {
    categories: {
      work: 'Trabalho',
      personal: 'Pessoal',
      studies: 'Estudos',
      home: 'Casa',
      health: 'Saúde',
    },
    habits: {
      read: 'Ler',
      exercise: 'Exercício',
      meditate: 'Meditar',
      water: 'Beber água',
    },
  },
} satisfies Messages<typeof en>
