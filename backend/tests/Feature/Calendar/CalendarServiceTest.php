<?php

use App\Models\User;
use App\Support\Calendar\CalendarService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    $this->user = User::factory()->create(['google_calendar_refresh_token' => 'rt-abc']);
});

function fakeToken(array $extra = []): void
{
    Http::fake(array_merge([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'at-123']),
    ], $extra));
}

it('lista eventos do período normalizados, marcando os externos', function () {
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => Http::response(['items' => [
            [
                'id' => 'ev1',
                'summary' => 'Dentista',
                'start' => ['dateTime' => '2026-09-23T10:00:00-03:00'],
                'end' => ['dateTime' => '2026-09-23T11:00:00-03:00'],
                'htmlLink' => 'https://calendar.google.com/event?eid=1',
            ],
            [
                'id' => 'ev2',
                'summary' => 'Estudar: Ritmo tasty 16th',
                'start' => ['dateTime' => '2026-09-23T19:00:00-03:00'],
                'end' => ['dateTime' => '2026-09-23T20:00:00-03:00'],
                'extendedProperties' => ['private' => [
                    'lifegui_type' => 'note',
                    'lifegui_ref' => 'Bateria/Ritmo tasty 16th.md',
                ]],
            ],
            [
                'id' => 'ev3',
                'summary' => 'Feriado',
                'start' => ['date' => '2026-09-24'],
                'end' => ['date' => '2026-09-25'],
            ],
        ]]),
    ]);

    $events = app(CalendarService::class)->events(
        $this->user,
        now()->parse('2026-09-21'),
        now()->parse('2026-09-28'),
    );

    expect($events)->toHaveCount(3);
    expect($events[0])->toMatchArray(['id' => 'ev1', 'external' => true, 'all_day' => false, 'lifegui' => null]);
    expect($events[1]['external'])->toBeFalse();
    expect($events[1]['lifegui'])->toBe(['type' => 'note', 'ref' => 'Bateria/Ritmo tasty 16th.md']);
    expect($events[2]['all_day'])->toBeTrue();

    Http::assertSent(function ($request) {
        if (! str_contains($request->url(), 'calendars/primary/events')) {
            return false;
        }

        return str_contains($request->url(), 'singleEvents=true')
            && str_contains($request->url(), 'orderBy=startTime')
            && $request->hasHeader('Authorization', 'Bearer at-123');
    });
});

it('pagina com nextPageToken', function () {
    $page = 0;
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => function () use (&$page) {
            $page++;

            return $page === 1
                ? Http::response(['items' => [['id' => 'a', 'summary' => 'A', 'start' => ['date' => '2026-09-23'], 'end' => ['date' => '2026-09-24']]], 'nextPageToken' => 'p2'])
                : Http::response(['items' => [['id' => 'b', 'summary' => 'B', 'start' => ['date' => '2026-09-24'], 'end' => ['date' => '2026-09-25']]]]);
        },
    ]);

    $events = app(CalendarService::class)->events($this->user, now(), now()->addWeek());

    expect($events)->toHaveCount(2)
        ->and($events[1]['id'])->toBe('b');
});

it('cria evento com vínculo, timezone e recorrência', function () {
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => Http::response(['id' => 'novo', 'summary' => 'Estudar: X',
            'start' => ['dateTime' => '2026-09-23T19:00:00-03:00'], 'end' => ['dateTime' => '2026-09-23T20:00:00-03:00'],
            'extendedProperties' => ['private' => ['lifegui_type' => 'habit', 'lifegui_ref' => '7']]]),
    ]);

    $event = app(CalendarService::class)->create($this->user, [
        'title' => 'Estudar: X',
        'description' => 'Aberto pelo lifegui',
        'start' => '2026-09-23T19:00:00-03:00',
        'end' => '2026-09-23T20:00:00-03:00',
        'timezone' => 'America/Sao_Paulo',
        'rrule' => 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
        'type' => 'habit',
        'ref' => '7',
    ]);

    expect($event['id'])->toBe('novo')->and($event['lifegui']['type'])->toBe('habit');

    Http::assertSent(function ($request) {
        if ($request->method() !== 'POST' || ! str_contains($request->url(), 'calendars/primary/events')) {
            return false;
        }
        $body = $request->data();

        return $body['summary'] === 'Estudar: X'
            && $body['start'] === ['dateTime' => '2026-09-23T19:00:00-03:00', 'timeZone' => 'America/Sao_Paulo']
            && $body['recurrence'] === ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE']
            && $body['extendedProperties']['private'] === ['lifegui_type' => 'habit', 'lifegui_ref' => '7'];
    });
});

it('busca eventos vinculados por privateExtendedProperty com chave repetida', function () {
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => Http::response(['items' => [
            ['id' => 'ev', 'summary' => 'Treino', 'start' => ['dateTime' => '2026-09-23T07:00:00-03:00'],
                'end' => ['dateTime' => '2026-09-23T08:00:00-03:00'],
                'recurrence' => ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'],
                'extendedProperties' => ['private' => ['lifegui_type' => 'habit', 'lifegui_ref' => '7']]],
        ]]),
    ]);

    $events = app(CalendarService::class)->linked($this->user, 'habit', '7');

    expect($events)->toHaveCount(1)
        ->and($events[0]['recurrence'])->toBe(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE']);

    Http::assertSent(function ($request) {
        if (! str_contains($request->url(), 'calendars/primary/events')) {
            return false;
        }

        // Chave repetida sem colchetes, valores urlencoded — formato que o Google exige.
        return str_contains($request->url(), 'privateExtendedProperty=lifegui_type%3Dhabit')
            && str_contains($request->url(), 'privateExtendedProperty=lifegui_ref%3D7')
            && ! str_contains($request->url(), 'privateExtendedProperty%5B');
    });
});

it('atualiza evento via PATCH', function () {
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => Http::response(['id' => 'ev', 'summary' => 'X',
            'start' => ['dateTime' => '2026-09-24T10:00:00-03:00'], 'end' => ['dateTime' => '2026-09-24T11:00:00-03:00']]),
    ]);

    app(CalendarService::class)->update($this->user, 'ev', [
        'start' => '2026-09-24T10:00:00-03:00',
        'end' => '2026-09-24T11:00:00-03:00',
        'timezone' => 'America/Sao_Paulo',
    ]);

    Http::assertSent(fn ($request) => $request->method() === 'PATCH'
        && str_ends_with(parse_url($request->url(), PHP_URL_PATH), '/events/ev'));
});

it('delete tolera evento já apagado (410)', function () {
    fakeToken([
        'www.googleapis.com/calendar/v3/*' => Http::response(null, 410),
    ]);

    app(CalendarService::class)->delete($this->user, 'ev');

    Http::assertSent(fn ($request) => $request->method() === 'DELETE');
});
