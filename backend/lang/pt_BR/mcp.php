<?php

// Instruções do servidor MCP e texto de saída das 7 tools (app/Mcp/Tools).
return [
    'instructions' => <<<'TXT'
    Assistente pessoal do usuário no lifegui: tarefas, hábitos, notas do segundo
    cérebro (vault Obsidian) e agenda (Google Calendar). Horários sempre em
    :timezone. Responda em português. Antes de criar eventos de
    calendário (tool schedule), confirme data, hora e título com o usuário.
    TXT,

    // Formatos de data/hora usados nas datas exibidas pelas tools (my_day,
    // create_task, schedule) — sempre sem ambiguidade pro idioma do usuário.
    'date_format' => 'd/m/Y',
    'datetime_format' => 'ddd D/MM HH:mm',

    'my_day' => [
        'heading_format' => 'dddd, D [de] MMMM',
        'tasks_heading' => '## Tarefas',
        'no_tasks' => 'Nenhuma tarefa com prazo pra hoje. Nada atrasado.',
        'overdue_item' => '- [ATRASADA desde :date] :title',
        'priority_marker' => '[prioridade] ',
        'agenda_heading' => '## Agenda',
        'no_events' => 'Nenhum evento no dia.',
        'calendar_not_connected' => 'Google Calendar não conectado (Configurações do lifegui).',
        'habits_heading' => '## Hábitos pendentes',
        'all_habits_done' => 'Todos os hábitos do dia já registrados.',
        'inbox_heading' => '## Inbox do cérebro',
        'inbox_empty' => 'Inbox zerado.',
        'inbox_count' => '{1} :count captura esperando processamento.|[2,*] :count capturas esperando processamento.',
    ],

    'my_studies' => [
        'heading' => '# Seus estudos',
        'notes_heading' => '## Notas',
        'no_status_label' => 'sem-status',
        'studying_label' => '**Estudando agora:** ',
        'to_review_label' => '**A revisar:** ',
        'habit_heading' => '## Hábito de estudos',
        'habit_not_found' => 'Nenhum hábito de estudos ativo.',
        'progress' => 'Feito :nx nesta semana.',
        'progress_with_target' => 'Feito :nx nesta semana de :target (meta).',
        'streak' => '{1} Sequência atual: :count dia.|[2,*] Sequência atual: :count dias.',
        'upcoming_heading' => '## Próximos blocos na agenda',
        'no_upcoming' => 'Nenhum bloco de estudo agendado.',
        'calendar_not_connected' => 'Google Calendar não conectado.',
        'event_item' => '- :title às :time:days',
        'weekly_suffix' => ' (toda :day)',
    ],

    'search_notes' => [
        'missing_args' => 'Informe "query" (texto) ou "path" (nota específica).',
        'note_not_found' => 'Nota não encontrada: :path.',
        'no_hits' => 'Nenhuma nota encontrada pra ":query".',
        'hits_header' => 'Notas encontradas pra ":query":',
        'hits_footer' => 'Use search_notes com o path pra ler uma nota inteira.',
    ],

    'capture' => [
        'inbox_missing' => 'Inbox não encontrado no vault do usuário.',
        'captured' => 'Capturado no inbox: :title (:path).',
    ],

    'create_task' => [
        'category_not_found' => 'Categoria ":category" não existe. Disponíveis: :available.',
        'created' => 'Tarefa criada: ":title".',
        'created_with_extras' => 'Tarefa criada: ":title" (:extras).',
        'priority_tag' => 'prioridade',
    ],

    'complete_habit' => [
        'not_found' => 'Hábito ":name" não encontrado. Ativos: :active.',
        'already_done' => '":name" já estava marcado como feito hoje.',
        'done' => '{1} ":name" marcado como feito hoje. Sequência atual: :count dia.|[2,*] ":name" marcado como feito hoje. Sequência atual: :count dias.',
    ],

    'schedule' => [
        'ref_required' => 'Tipo :type exige "ref" (id da tarefa/hábito ou caminho da nota).',
        'item_not_found' => 'Item não encontrado: :type :ref.',
        'calendar_not_connected' => 'Google Calendar não conectado. Conecte em Configurações no lifegui.',
        'created' => 'Evento criado: ":title" em :when:recurrence.',
        'weekly_suffix' => ' (semanal: :days)',
    ],
];
