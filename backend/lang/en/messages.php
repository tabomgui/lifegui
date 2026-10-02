<?php

// Backend error messages and UI copy (API + MCP Blade pages) that don't come
// from Laravel's validation rules.
return [
    'auth' => [
        'invalid_credentials' => 'Invalid credentials.',
        'registration_disabled' => 'Sign-up is disabled on this instance.',
    ],
    'setup' => [
        'in_progress' => 'Setup in progress. Try again in a moment.',
        'already_done' => 'This instance is already set up.',
    ],
    'tokens' => [
        'capture_only' => 'This token can only capture to the inbox.',
    ],
    'modules' => [
        'unknown' => 'Unknown module.',
        'tasks' => ['label' => 'Tasks', 'description' => 'Everyday to-dos.'],
        'habits' => ['label' => 'Habits', 'description' => 'Daily check-ins and streaks.'],
        'brain' => ['label' => 'Brain', 'description' => 'Library of content and notes from your Obsidian vault.'],
    ],
    'calendar' => [
        'external_event' => 'This event is not managed by lifegui.',
        'item_not_found' => 'Item not found.',
        'not_connected' => 'Google Calendar not connected.',
        'api_disabled' => 'The Google Calendar API is disabled in the Google Cloud project. Enable it and try again.',
        'insufficient_access' => 'Google refused access to the calendar. Disconnect and reconnect in Settings.',
        'event_not_found' => 'Event not found in Google Calendar.',
        'api_error' => 'Google Calendar refused the operation: :reason',
        'unknown_error' => 'unknown error',
        'untitled' => '(untitled)',
        'created_by' => 'Created by lifegui · :link',
    ],
    'brain' => [
        'note_not_found' => 'Note not found in the vault.',
        'invalid_title' => 'Invalid title.',
        'note_exists' => 'A note with this title already exists.',
        'invalid_category' => 'Invalid category.',
        'trash_missing' => 'Trash folder not found in the vault.',
        'inbox_missing' => 'Inbox not found in the vault.',
        'processed_missing' => 'The 00-Inbox/processados folder was not found in the vault.',
        'discarded_missing' => 'The 00-Inbox/descartados folder was not found in the vault.',
        'category_exists' => 'A category with this name already exists.',
        'vault_not_initialized' => 'Vault not initialized.',
        'category_not_empty' => 'This category has notes. Move or finish them before deleting it.',
    ],
    'consent' => [
        'title' => 'Authorize access',
        'wants_to_connect' => ':client wants to connect to your account: read and act on your tasks, habits, notes and calendar.',
        'connecting_as' => 'Connecting as :name (:email)',
        'deny' => 'Deny',
        'approve' => 'Authorize',
    ],
    // Custom FormRequest messages (withValidator/messages()), outside Laravel's
    // standard validation rules — these don't come from lang:update.
    'validation' => [
        'max_period' => 'Maximum period of :days days.',
        'future_date' => "You can't mark a future day.",
        'empty_task_list' => 'Write at least one task.',
        'too_many_tasks' => 'Too many tasks at once (max :max).',
    ],
];
