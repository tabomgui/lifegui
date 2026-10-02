<?php

// Mensagens de erro e textos de UI do backend (API + páginas Blade do MCP)
// que não vêm das regras de validação do Laravel.
return [
    'auth' => [
        'invalid_credentials' => 'Credenciais inválidas.',
        'registration_disabled' => 'Cadastro desativado nesta instância.',
    ],
    'setup' => [
        'in_progress' => 'Configuração em andamento. Tente de novo em instantes.',
        'already_done' => 'Esta instância já foi configurada.',
    ],
    'tokens' => [
        'capture_only' => 'Este token só permite capturar no inbox.',
    ],
    'modules' => [
        'unknown' => 'Módulo desconhecido.',
        'tasks' => ['label' => 'Tarefas', 'description' => 'Afazeres do dia a dia.'],
        'habits' => ['label' => 'Hábitos', 'description' => 'Check-in diário e sequências.'],
        'brain' => ['label' => 'Cérebro', 'description' => 'Biblioteca de conteúdos e notas do vault Obsidian.'],
    ],
    'calendar' => [
        'external_event' => 'Evento não gerenciado pelo lifegui.',
        'item_not_found' => 'Item não encontrado.',
        'not_connected' => 'Google Calendar não conectado.',
        'api_disabled' => 'A Google Calendar API está desativada no projeto do Google Cloud. Ative-a e tente de novo.',
        'insufficient_access' => 'O Google recusou o acesso à agenda. Desconecte e conecte de novo em Configurações.',
        'event_not_found' => 'Evento não encontrado no Google Calendar.',
        'api_error' => 'O Google Calendar recusou a operação: :reason',
        'unknown_error' => 'erro desconhecido',
        'untitled' => '(sem título)',
        'created_by' => 'Criado pelo lifegui · :link',
    ],
    'brain' => [
        'note_not_found' => 'Nota não encontrada no vault.',
        'invalid_title' => 'Título inválido.',
        'note_exists' => 'Já existe uma nota com esse título.',
        'invalid_category' => 'Categoria inválida.',
        'trash_missing' => 'Lixeira não encontrada no vault.',
        'inbox_missing' => 'Inbox não encontrado no vault.',
        'processed_missing' => 'Pasta processados não encontrada no vault.',
        'discarded_missing' => 'Pasta descartados não encontrada no vault.',
        'category_exists' => 'Já existe uma categoria com esse nome.',
        'vault_not_initialized' => 'Vault não inicializado.',
        'category_not_empty' => 'A categoria tem notas; mova ou conclua antes de apagar.',
    ],
    'consent' => [
        'title' => 'Autorizar acesso',
        'wants_to_connect' => ':client quer se conectar à sua conta: ler e agir sobre suas tarefas, hábitos, notas e agenda.',
        'connecting_as' => 'Conectando como :name (:email)',
        'deny' => 'Recusar',
        'approve' => 'Autorizar',
    ],
    // Mensagens customizadas de FormRequests (withValidator/messages()), fora
    // das regras padrão do Laravel — essas não vêm do lang:update.
    'validation' => [
        'max_period' => 'Período máximo de :days dias.',
        'future_date' => 'Não dá para marcar um dia futuro.',
        'empty_task_list' => 'Escreva ao menos uma tarefa.',
        'too_many_tasks' => 'Muitas tarefas de uma vez (máx. :max).',
    ],
];
