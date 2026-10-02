<?php

// MCP server instructions and output text for the 7 tools (app/Mcp/Tools).
return [
    'instructions' => <<<'TXT'
    Personal assistant for the user's lifegui: tasks, habits, second-brain notes
    (Obsidian vault) and calendar (Google Calendar). Times are always in
    America/Sao_Paulo. Answer in English. Before creating calendar events
    (schedule tool), confirm date, time and title with the user.
    TXT,

    // Accepted names for the study habit, used by the my_studies tool.
    // Same list in both languages: recognizes the habit regardless of how
    // the user named it.
    'study_habit_names' => ['Estudar', 'Study'],

    'my_day' => [
        'heading_format' => 'dddd, MMMM D',
        'tasks_heading' => '## Tasks',
        'no_tasks' => 'No tasks due today. Nothing overdue.',
        'overdue_item' => '- [OVERDUE since :date] :title',
        'priority_marker' => '[priority] ',
        'agenda_heading' => '## Calendar',
        'no_events' => 'No events today.',
        'calendar_not_connected' => 'Google Calendar not connected (Settings in lifegui).',
        'habits_heading' => '## Pending habits',
        'all_habits_done' => "All of today's habits are already logged.",
        'inbox_heading' => '## Brain inbox',
        'inbox_empty' => 'Inbox is empty.',
        'inbox_count' => ':n capture(s) waiting to be processed.',
    ],

    'my_studies' => [
        'heading' => '# Your studies',
        'notes_heading' => '## Notes',
        'no_status_label' => 'no-status',
        'studying_label' => '**Currently studying:** ',
        'to_review_label' => '**To review:** ',
        'habit_heading' => '## Study habit',
        'habit_not_found' => 'No study habit active.',
        'progress' => 'Done :nx this week.',
        'progress_with_target' => 'Done :nx this week out of :target (goal).',
        'streak' => 'Current streak: :n day(s).',
        'upcoming_heading' => '## Upcoming calendar blocks',
        'no_upcoming' => 'No study block scheduled.',
        'calendar_not_connected' => 'Google Calendar not connected.',
        'event_item' => '- :title at :time:days',
        'weekly_suffix' => ' (every :day)',
    ],

    'search_notes' => [
        'missing_args' => 'Provide "query" (text) or "path" (specific note).',
        'note_not_found' => 'Note not found: :path.',
        'no_hits' => 'No notes found for ":query".',
        'hits_header' => 'Notes found for ":query":',
        'hits_footer' => 'Use search_notes with path to read an entire note.',
    ],

    'capture' => [
        'inbox_missing' => "Inbox not found in the user's vault.",
        'captured' => 'Captured to inbox: :title (:path).',
    ],

    'create_task' => [
        'category_not_found' => 'Category ":category" does not exist. Available: :available.',
        'created' => 'Task created: ":title"',
        'priority_tag' => 'priority',
    ],

    'complete_habit' => [
        'not_found' => 'Habit ":name" not found. Active: :active.',
        'already_done' => '":name" was already marked as done today.',
        'done' => '":name" marked as done today. Current streak: :streak day(s).',
    ],

    'schedule' => [
        'ref_required' => 'Type :type requires "ref" (task/habit id or note path).',
        'item_not_found' => 'Item not found: :type :ref.',
        'calendar_not_connected' => 'Google Calendar not connected. Connect it in Settings in lifegui.',
        'created' => 'Event created: ":title" at :when:recurrence.',
        'weekly_suffix' => ' (weekly: :days)',
    ],
];
