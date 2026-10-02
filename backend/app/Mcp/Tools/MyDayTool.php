<?php

namespace App\Mcp\Tools;

use App\Models\Habit;
use App\Models\Task;
use App\Support\Calendar\CalendarNotConnectedException;
use App\Support\Calendar\CalendarService;
use App\Support\Vault\VaultService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Support\Facades\Auth;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('my_day')]
#[Description("Summary of the user's day: overdue tasks and tasks due today, calendar events (Google Calendar), habits not done yet and pending captures in the second-brain inbox. Use for \"what do I have to do today\" or planning the day.")]
class MyDayTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private VaultService $vault,
        private CalendarService $calendar,
    ) {}

    public function handle(Request $request): Response
    {
        $dia = $request->get('date')
            ? CarbonImmutable::parse($request->get('date'), self::TZ)
            : CarbonImmutable::now(self::TZ);

        $out = ['# '.$dia->locale(app()->getLocale())->isoFormat(__('mcp.my_day.heading_format')), ''];

        // Tarefas
        $atrasadas = Task::where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $dia->toDateString())
            ->orderBy('due_date')
            ->get();
        $doDia = Task::where('status', '!=', 'done')
            ->whereDate('due_date', $dia->toDateString())
            ->get();

        $out[] = __('mcp.my_day.tasks_heading');
        if ($atrasadas->isEmpty() && $doDia->isEmpty()) {
            $out[] = __('mcp.my_day.no_tasks');
        }
        foreach ($atrasadas as $t) {
            $out[] = __('mcp.my_day.overdue_item', ['date' => $t->due_date->format('d/m'), 'title' => $t->title]);
        }
        foreach ($doDia as $t) {
            $out[] = '- '.($t->is_priority ? __('mcp.my_day.priority_marker') : '').$t->title;
        }
        $out[] = '';

        // Agenda
        $out[] = __('mcp.my_day.agenda_heading');
        try {
            $events = $this->calendar->events(Auth::user(), $dia->startOfDay(), $dia->endOfDay());
            if ($events === []) {
                $out[] = __('mcp.my_day.no_events');
            }
            foreach ($events as $e) {
                $start = $e['start'] ? CarbonImmutable::parse($e['start'])->setTimezone(self::TZ)->format('H:i') : '';
                $tag = $e['external'] ? '' : ' ('.($e['lifegui']['type'] ?? 'lifegui').')';
                $out[] = "- {$start} {$e['title']}{$tag}";
            }
        } catch (CalendarNotConnectedException) {
            $out[] = __('mcp.my_day.calendar_not_connected');
        }
        $out[] = '';

        // Hábitos ainda não feitos no dia
        $pendentes = Habit::whereNull('archived_at')
            ->whereDoesntHave('logs', fn ($q) => $q->where('date', $dia->toDateString()))
            ->get();
        $out[] = __('mcp.my_day.habits_heading');
        $out[] = $pendentes->isEmpty()
            ? __('mcp.my_day.all_habits_done')
            : $pendentes->map(fn ($h) => "- {$h->name}")->implode("\n");
        $out[] = '';

        // Inbox
        $inbox = count($this->vault->listMarkdown('00-Inbox'));
        $out[] = __('mcp.my_day.inbox_heading');
        $out[] = $inbox === 0 ? __('mcp.my_day.inbox_empty') : __('mcp.my_day.inbox_count', ['n' => $inbox]);

        return Response::text(implode("\n", $out));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'date' => $schema->string()
                ->description('Desired day in Y-m-d format. Omit for today.'),
        ];
    }
}
