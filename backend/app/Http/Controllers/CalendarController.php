<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use App\Models\Task;
use App\Support\Calendar\CalendarService;
use App\Support\Calendar\GoogleTokenService;
use App\Support\GoogleCredentials;
use App\Support\Vault\VaultService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Agenda do usuário: leitura/escrita ao vivo no Google Calendar (fonte da
 * verdade — nada de evento no MySQL). Eventos externos (não criados pelo
 * lifegui) são somente leitura.
 */
class CalendarController extends Controller
{
    public function __construct(
        private CalendarService $calendar,
        private GoogleTokenService $tokens,
    ) {}

    public function status(Request $request): JsonResponse
    {
        return response()->json(['data' => [
            'configured' => GoogleCredentials::configured(),
            'connected' => (bool) $request->user()->google_calendar_refresh_token,
            'connected_at' => $request->user()->google_calendar_connected_at,
        ]]);
    }

    public function disconnect(Request $request): Response
    {
        $this->tokens->disconnect($request->user());

        return response()->noContent();
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['required', 'date'],
            'to' => ['required', 'date', 'after:from'],
        ]);

        $events = $this->calendar->events(
            $request->user(),
            CarbonImmutable::parse($data['from']),
            CarbonImmutable::parse($data['to']),
        );

        return response()->json(['data' => $events]);
    }

    public function linked(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['task', 'habit', 'note'])],
            'ref' => ['required', 'string'],
        ]);

        return response()->json(['data' => $this->calendar->linked(
            $request->user(), $data['type'], $data['ref'],
        )]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            // 'event' = avulso, criado direto na agenda, sem item vinculado.
            // nullable: o front manda ref:"" pra avulso e o middleware vira null.
            'type' => ['required', Rule::in(['task', 'habit', 'note', 'event'])],
            'ref' => ['nullable', 'required_unless:type,event', 'string', 'max:500'],
            'title' => ['required', 'string', 'max:255'],
            'start' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'rrule' => ['nullable', 'string', 'regex:/^RRULE:/'],
            'timezone' => ['nullable', 'timezone'],
        ]);

        if ($data['type'] !== 'event') {
            $this->assertRefOwned($request, $data['type'], $data['ref']);
        }

        $start = CarbonImmutable::parse($data['start']);
        $end = $start->addMinutes($data['duration_minutes'] ?? 60);

        $event = $this->calendar->create($request->user(), [
            'title' => $data['title'],
            'description' => 'Criado pelo lifegui · '.$this->backlink($data['type']),
            'start' => $start->toRfc3339String(),
            'end' => $end->toRfc3339String(),
            'timezone' => $data['timezone'] ?? config('app.timezone'),
            'rrule' => $data['rrule'] ?? null,
            'type' => $data['type'],
            'ref' => $data['ref'] ?? '',
        ]);

        return response()->json(['data' => $event], 201);
    }

    public function show(Request $request, string $eventId): JsonResponse
    {
        return response()->json(['data' => $this->calendar->get($request->user(), $eventId)]);
    }

    public function update(Request $request, string $eventId): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'start' => ['sometimes', 'required', 'date'],
            'end' => ['sometimes', 'required', 'date'],
            'rrule' => ['sometimes', 'nullable', 'string', 'regex:/^RRULE:/'],
            'timezone' => ['nullable', 'timezone'],
            // occurrence (padrão): só o evento clicado; series: o "pai" da
            // recorrência inteira.
            'scope' => ['sometimes', Rule::in(['occurrence', 'series'])],
        ]);

        $user = $request->user();
        $event = $this->calendar->get($user, $eventId);
        abort_if($event['external'], 403, __('messages.calendar.external_event'));

        $tz = $data['timezone'] ?? config('app.timezone');
        $targetId = $eventId;
        $patch = ['timezone' => $tz];

        if (($data['scope'] ?? 'occurrence') === 'series' && $event['recurring_event_id']) {
            // Edição em massa: aplica no pai. A data da série vem da RRULE;
            // do request só interessa a HORA nova, transplantada pra data
            // original do pai (senão a série inteira mudaria de dia).
            $targetId = $event['recurring_event_id'];
            $master = $this->calendar->get($user, $targetId);

            if (isset($data['start'])) {
                $requestStart = CarbonImmutable::parse($data['start'])->setTimezone($tz);
                $duration = isset($data['end'])
                    ? $requestStart->diffInMinutes(CarbonImmutable::parse($data['end'])->setTimezone($tz))
                    : CarbonImmutable::parse($master['start'])->diffInMinutes(CarbonImmutable::parse($master['end']));

                $newStart = CarbonImmutable::parse($master['start'])
                    ->setTimezone($tz)
                    ->setTime($requestStart->hour, $requestStart->minute);
                $patch['start'] = $newStart->toRfc3339String();
                $patch['end'] = $newStart->addMinutes($duration)->toRfc3339String();
            }
        } else {
            if (isset($data['start'])) {
                $patch['start'] = CarbonImmutable::parse($data['start'])->toRfc3339String();
            }
            if (isset($data['end'])) {
                $patch['end'] = CarbonImmutable::parse($data['end'])->toRfc3339String();
            }
        }

        if (isset($data['title'])) {
            $patch['title'] = $data['title'];
        }
        if (array_key_exists('rrule', $data)) {
            $patch['rrule'] = $data['rrule'];
        }

        return response()->json(['data' => $this->calendar->update($user, $targetId, $patch)]);
    }

    public function destroy(Request $request, string $eventId): Response
    {
        $this->assertOwnEvent($request, $eventId);

        $this->calendar->delete($request->user(), $eventId);

        return response()->noContent();
    }

    /** O lifegui só edita/apaga o que criou (identificado pelo vínculo no evento). */
    private function assertOwnEvent(Request $request, string $eventId): void
    {
        $event = $this->calendar->get($request->user(), $eventId);

        abort_if($event['external'], 403, __('messages.calendar.external_event'));
    }

    /** ref precisa existir e ser do usuário (tarefa/hábito no banco, nota no vault). */
    private function assertRefOwned(Request $request, string $type, string $ref): void
    {
        $owned = match ($type) {
            'task' => Task::whereKey($ref)->exists(),
            'habit' => Habit::whereKey($ref)->exists(),
            'note' => app(VaultService::class)->read($ref) !== null,
        };

        if (! $owned) {
            throw ValidationException::withMessages(['ref' => __('messages.calendar.item_not_found')]);
        }
    }

    private function backlink(string $type): string
    {
        $path = match ($type) {
            'task' => '/',
            'habit' => '/habits',
            'note' => '/cerebro',
            'event' => '/agenda',
        };

        return config('app.frontend_url').$path;
    }
}
