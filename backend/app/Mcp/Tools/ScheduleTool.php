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

#[Name('schedule')]
#[Description("Creates an event on the user's Google Calendar (primary calendar): standalone or linked to a task/habit/note. IMPORTANT: confirm title, date and time with the user before calling. Weekly recurrence via repeat_days.")]
class ScheduleTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private CalendarService $calendar,
        private VaultService $vault,
    ) {}

    public function handle(Request $request): Response
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'start' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'type' => ['nullable', 'in:event,task,habit,note'],
            'ref' => ['nullable', 'string', 'max:500'],
            'repeat_days' => ['nullable', 'array'],
            'repeat_days.*' => ['in:MO,TU,WE,TH,FR,SA,SU'],
        ]);

        $tipo = $request->get('type') ?? 'event';
        $ref = (string) ($request->get('ref') ?? '');

        if ($tipo !== 'event') {
            if ($ref === '') {
                return Response::error(__('mcp.schedule.ref_required', ['type' => $tipo]));
            }
            $owned = match ($tipo) {
                'task' => Task::whereKey($ref)->exists(),
                'habit' => Habit::whereKey($ref)->exists(),
                'note' => $this->vault->read($ref) !== null,
            };
            if (! $owned) {
                return Response::error(__('mcp.schedule.item_not_found', ['type' => $tipo, 'ref' => $ref]));
            }
        }

        $inicio = CarbonImmutable::parse($request->get('start'), self::TZ);
        $fim = $inicio->addMinutes($request->get('duration_minutes') ?? 60);
        $dias = $request->get('repeat_days') ?? [];

        try {
            $event = $this->calendar->create(Auth::user(), [
                'title' => $request->get('title'),
                'description' => $this->calendar->createdByDescription($tipo),
                'start' => $inicio->toRfc3339String(),
                'end' => $fim->toRfc3339String(),
                'timezone' => self::TZ,
                'rrule' => $dias !== [] ? 'RRULE:FREQ=WEEKLY;BYDAY='.implode(',', $dias) : null,
                'type' => $tipo,
                'ref' => $ref,
            ]);
        } catch (CalendarNotConnectedException) {
            return Response::error(__('mcp.schedule.calendar_not_connected'));
        }

        $quando = $inicio->locale(app()->getLocale())->isoFormat(__('mcp.datetime_format'));
        $rec = $dias !== [] ? __('mcp.schedule.weekly_suffix', ['days' => implode(', ', $dias)]) : '';

        return Response::text(__('mcp.schedule.created', ['title' => $event['title'], 'when' => $quando, 'recurrence' => $rec]));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->description('Event title.')->required(),
            'start' => $schema->string()->description('ISO start (e.g. 2026-09-25T19:00:00). Interpreted in America/Sao_Paulo if no offset is given.')->required(),
            'duration_minutes' => $schema->integer()->description('Duration in minutes (default 60).'),
            'type' => $schema->string()->enum(['event', 'task', 'habit', 'note'])->description('event = standalone (default); task/habit/note links to an item.'),
            'ref' => $schema->string()->description('Id of the task/habit or path of the note, when type is not event.'),
            'repeat_days' => $schema->array()
                ->items($schema->string()->enum(['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']))
                ->description('Days of the week to repeat every week.'),
        ];
    }
}
