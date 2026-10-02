import type en from '../en/dashboards'
import type { Messages } from '../../types'

export default {
  periodLabel: 'Período',
  units: {
    days: '{{value}}d',
  },
  charts: {
    noData: 'Sem dados no período.',
    weekOf: 'Semana de {{date}}',
  },
  tasks: {
    highlights: {
      heading: 'Destaques de tarefas',
      deltaCaption: 'delta vs período anterior',
    },
    stats: {
      completed: 'Tarefas concluídas',
      completedCaption: 'throughput bruto do período',
      netFlow: 'Fluxo líquido',
      netFlowCaption: 'concluídas − criadas',
      overdue: 'Tarefas atrasadas',
      overdueCaption: 'ao vivo · mais antiga {{value}}',
      cycleTime: 'Tempo de ciclo mediano',
      cycleTimeCaption: 'criado → concluído · mediana',
      cycleTimeEmpty: '—',
    },
    flowSection: {
      heading: 'Fluxo de tarefas',
      weeklyChart: {
        title: 'Criadas vs concluídas por semana',
        subtitle: 'throughput vs intake · semanas sombreadas = concluídas < criadas',
        createdLabel: 'Criadas',
        completedLabel: 'Concluídas',
        tooltip: 'Semana de {{date}} · criadas {{created}} · concluídas {{completed}}',
      },
      categoryDonut: {
        title: 'Trabalho aberto por categoria',
        subtitle: 'onde o pendente está concentrado',
        empty: 'Nada aberto no momento.',
        openLabel: 'abertas',
      },
      agingWip: {
        title: 'Tarefas mais antigas em aberto',
        subtitle: 'aging WIP · o que fazer ou matar',
        empty: 'Nenhuma tarefa em aberto.',
        legendOver7: '> 7 dias',
        legendOver30: '> 30 dias',
      },
    },
    dueSection: {
      heading: 'Prazos',
      dueSoon: {
        title: 'Vencendo em breve — próximos 7 dias',
        subtitle: 'abertas com data no horizonte · atrasadas em destaque',
        overdueSwatch: 'Atrasadas',
        upcomingSwatch: 'A vencer',
        overdueShort: 'Atras.',
        today: 'Hoje',
      },
      noDueDate: {
        title: 'Trabalho aberto sem data',
        subtitle: 'higiene de prazos',
        caption: '{{count}} de {{total}} abertas sem data',
        hint: 'invisível a toda visão de prazo — explica o denominador do "no prazo".',
      },
      onTimeRate: {
        title: 'Taxa de conclusão no prazo',
        subtitle: 'das tarefas com data · denominador sempre visível',
        caption: 'no prazo · n={{total}}',
        onTimeTitle: 'No prazo {{rate}}%',
        lateTitle: 'Fora do prazo {{rate}}%',
        onTimeSwatch: 'No prazo ({{count}})',
        lateSwatch: 'Fora do prazo ({{count}})',
      },
      overdueHistogram: {
        title: 'Atrasadas por tempo de atraso',
        subtitle: 'deslize fresco vs apodrecimento crônico',
        buckets: {
          '1-3': '1–3d',
          '4-7': '4–7d',
          '8-30': '8–30d',
          '30+': '30d+',
        },
      },
    },
    heatmap: {
      heading: 'Heatmap de conclusões',
      title: 'Tarefas concluídas por dia',
    },
  },
  habits: {
    highlights: {
      heading: 'Destaques de hábitos',
    },
    stats: {
      perfectDays: 'Dias perfeitos',
      perfectDaysCaption: 'atual {{current}} · recorde {{record}}',
      consistency: 'Consistência',
      consistencyCaption: 'feito/exigido por dia · média do período',
      avgAdherence: 'Aderência média',
      avgAdherenceCaption: 'média das metas de todos os hábitos',
      activeHabits: 'Hábitos ativos',
      activeHabitsCaption: 'em acompanhamento',
    },
    consistencySection: {
      heading: 'Consistência & aderência',
      chart: {
        title: 'Consistência diária',
        subtitle: '% feito/exigido por dia · média móvel 7d · linha de referência da média',
        movingAverageLegend: 'Média móvel 7d',
        dailyLegend: '% diário',
        averageLegend: 'Média do período',
        averageLabel: 'média {{value}}%',
        tooltip: 'diário {{pct}}% · média 7d {{avg}}%',
      },
      radar: {
        title: 'Radar de aderência por hábito',
        subtitle: '% de aderência à meta no período',
      },
      streaks: {
        title: 'Sequência por hábito',
        subtitle: 'momentum atual vs recorde · sequência quebrada em vermelho',
        empty: 'Nenhum hábito ativo.',
        current: 'atual',
        record: 'recorde',
      },
    },
    heatmap: {
      heading: 'Heatmap de conclusões',
      title: 'Hábitos concluídos por dia',
    },
  },
  brain: {
    highlights: {
      heading: 'Destaques do cérebro',
    },
    stats: {
      notes: 'Notas no vault',
      notesCaption: 'todas as categorias',
      studying: 'Em estudo',
      studyingCaption: 'status estudando',
      done: 'Concluídas',
      doneCaption: 'estudo finalizado',
      inbox: 'Inbox pendente',
      inboxCaptionEmpty: 'nada esperando triagem',
      inboxCaption: 'esperando triagem',
    },
    pipelineSection: {
      heading: 'Pipeline de estudo',
      statusFunnel: {
        title: 'Funil de status',
        subtitle: 'onde as notas estão no ciclo de estudo',
        empty: 'Nenhuma nota ainda.',
        noStatus: 'Sem status',
      },
      categoryVolume: {
        title: 'Notas por categoria',
        subtitle: 'volume de conhecimento por área',
        empty: 'Nenhuma categoria.',
      },
    },
    activitySection: {
      heading: 'Atividade',
      writingChart: {
        title: 'Atividade de escrita por semana',
        subtitle: 'está estudando de verdade ou só acumulando?',
        createdLabel: 'Criadas',
        updatedLabel: 'Atualizadas',
        tooltip: 'Semana de {{date}} · criadas {{created}} · atualizadas {{updated}}',
      },
      inboxBacklog: {
        title: 'Backlog do inbox',
        subtitle_one: '{{count}} pendente · agrupado pela semana em que entrou',
        subtitle_other: '{{count}} pendentes · agrupado pela semana em que entrou',
        empty: 'Inbox zerado. Nada esperando.',
        outOfWindow_one: '{{count}} pendente, mas fora da janela selecionada — aumente o período.',
        outOfWindow_other: '{{count}} pendentes, mas fora da janela selecionada — aumente o período.',
      },
    },
  },
} satisfies Messages<typeof en>
