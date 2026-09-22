<?php

use App\Models\Habit;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    $this->actingAs($this->user = User::factory()->create([
        'google_calendar_refresh_token' => 'rt-abc',
        'google_calendar_connected_at' => now(),
    ]));
    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'at-123']),
    ]);
});

function fakeCalendar(array|callable $response): void
{
    Http::fake(['www.googleapis.com/calendar/v3/*' => is_callable($response) ? $response : Http::response($response)]);
}

test('status reflete a conexão', function () {
    $this->getJson('/api/calendar/status')
        ->assertOk()
        ->assertJsonPath('data.connected', true);
});

test('sem conexão, listar eventos responde 409', function () {
    $this->actingAs(User::factory()->create());

    $this->getJson('/api/calendar/events?from=2026-09-21&to=2026-09-28')
        ->assertStatus(409)
        ->assertJsonPath('message', 'Google Calendar não conectado.');
});

test('lista eventos do período', function () {
    fakeCalendar(['items' => [[
        'id' => 'ev1',
        'summary' => 'Dentista',
        'start' => ['dateTime' => '2026-09-23T10:00:00-03:00'],
        'end' => ['dateTime' => '2026-09-23T11:00:00-03:00'],
    ]]]);

    $this->getJson('/api/calendar/events?from=2026-09-21&to=2026-09-28')
        ->assertOk()
        ->assertJsonPath('data.0.id', 'ev1')
        ->assertJsonPath('data.0.external', true);
});

test('agenda uma tarefa própria', function () {
    $task = Task::factory()->for($this->user)->create(['title' => 'Pagar boleto']);
    fakeCalendar(function ($request) {
        expect($request->data()['extendedProperties']['private']['lifegui_type'])->toBe('task');

        return Http::response([
            'id' => 'novo',
            'summary' => 'Pagar boleto',
            'start' => ['dateTime' => '2026-09-23T09:00:00-03:00'],
            'end' => ['dateTime' => '2026-09-23T10:00:00-03:00'],
            'extendedProperties' => ['private' => ['lifegui_type' => 'task', 'lifegui_ref' => (string) $request->data()['extendedProperties']['private']['lifegui_ref']]],
        ]);
    });

    $this->postJson('/api/calendar/events', [
        'type' => 'task',
        'ref' => (string) $task->id,
        'title' => 'Pagar boleto',
        'start' => '2026-09-23T09:00:00-03:00',
        'timezone' => 'America/Sao_Paulo',
    ])
        ->assertCreated()
        ->assertJsonPath('data.lifegui.type', 'task');
});

test('recusa agendar tarefa de outro usuário', function () {
    $other = User::factory()->create();
    $task = Task::factory()->for($other)->create();

    $this->postJson('/api/calendar/events', [
        'type' => 'task',
        'ref' => (string) $task->id,
        'title' => 'Alheia',
        'start' => '2026-09-23T09:00:00-03:00',
    ])->assertStatus(422)->assertJsonValidationErrors('ref');
});

test('agenda um hábito recorrente', function () {
    $habit = Habit::factory()->for($this->user)->create();
    fakeCalendar(function ($request) {
        expect($request->data()['recurrence'])->toBe(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE']);

        return Http::response([
            'id' => 'rec',
            'summary' => 'Treino',
            'start' => ['dateTime' => '2026-09-23T07:00:00-03:00'],
            'end' => ['dateTime' => '2026-09-23T08:00:00-03:00'],
            'recurrence' => ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'],
            'extendedProperties' => ['private' => ['lifegui_type' => 'habit', 'lifegui_ref' => '1']],
        ]);
    });

    $this->postJson('/api/calendar/events', [
        'type' => 'habit',
        'ref' => (string) $habit->id,
        'title' => 'Treino',
        'start' => '2026-09-23T07:00:00-03:00',
        'rrule' => 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE',
    ])->assertCreated();
});

test('agenda estudo de uma nota do vault', function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    File::ensureDirectoryExists(vaultPath().'/IA');
    makeNote('IA/RAG.md', ['status' => 'novo']);

    fakeCalendar([
        'id' => 'nota-ev',
        'summary' => 'Estudar: RAG',
        'start' => ['dateTime' => '2026-09-23T19:00:00-03:00'],
        'end' => ['dateTime' => '2026-09-23T20:00:00-03:00'],
        'extendedProperties' => ['private' => ['lifegui_type' => 'note', 'lifegui_ref' => 'IA/RAG.md']],
    ]);

    $this->postJson('/api/calendar/events', [
        'type' => 'note',
        'ref' => 'IA/RAG.md',
        'title' => 'Estudar: RAG',
        'start' => '2026-09-23T19:00:00-03:00',
    ])->assertCreated()->assertJsonPath('data.lifegui.ref', 'IA/RAG.md');

    File::deleteDirectory($this->vaultRoot);
});

test('recusa agendar nota inexistente', function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    File::ensureDirectoryExists(vaultPath());

    $this->postJson('/api/calendar/events', [
        'type' => 'note',
        'ref' => 'IA/Nao-existe.md',
        'title' => 'Estudar',
        'start' => '2026-09-23T19:00:00-03:00',
    ])->assertStatus(422)->assertJsonValidationErrors('ref');

    File::deleteDirectory($this->vaultRoot);
});

test('não edita nem apaga evento externo', function () {
    fakeCalendar([
        'id' => 'pessoal',
        'summary' => 'Aniversário',
        'start' => ['dateTime' => '2026-09-23T12:00:00-03:00'],
        'end' => ['dateTime' => '2026-09-23T13:00:00-03:00'],
    ]);

    $this->patchJson('/api/calendar/events/pessoal', ['start' => '2026-09-23T14:00:00-03:00'])
        ->assertForbidden();
    $this->deleteJson('/api/calendar/events/pessoal')->assertForbidden();
});

test('move um evento do lifegui', function () {
    fakeCalendar(function ($request) {
        return Http::response([
            'id' => 'meu',
            'summary' => 'Estudar',
            'start' => ['dateTime' => $request->method() === 'PATCH' ? '2026-09-24T10:00:00-03:00' : '2026-09-23T10:00:00-03:00'],
            'end' => ['dateTime' => $request->method() === 'PATCH' ? '2026-09-24T11:00:00-03:00' : '2026-09-23T11:00:00-03:00'],
            'extendedProperties' => ['private' => ['lifegui_type' => 'note', 'lifegui_ref' => 'IA/RAG.md']],
        ]);
    });

    $this->patchJson('/api/calendar/events/meu', [
        'start' => '2026-09-24T10:00:00-03:00',
        'end' => '2026-09-24T11:00:00-03:00',
    ])->assertOk()->assertJsonPath('data.start', '2026-09-24T10:00:00-03:00');
});

test('lista eventos vinculados a um item', function () {
    fakeCalendar(['items' => [[
        'id' => 'rec',
        'summary' => 'Treino',
        'start' => ['dateTime' => '2026-09-23T07:00:00-03:00'],
        'end' => ['dateTime' => '2026-09-23T08:00:00-03:00'],
        'recurrence' => ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE'],
        'extendedProperties' => ['private' => ['lifegui_type' => 'habit', 'lifegui_ref' => '7']],
    ]]]);

    $this->getJson('/api/calendar/events/linked?type=habit&ref=7')
        ->assertOk()
        ->assertJsonPath('data.0.recurrence.0', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE');
});

test('desconecta a conta', function () {
    $this->deleteJson('/api/calendar/connection')->assertNoContent();

    expect($this->user->refresh()->google_calendar_refresh_token)->toBeNull();
});

test('cria evento avulso direto na agenda (sem vínculo)', function () {
    fakeCalendar(function ($request) {
        expect($request->data()['extendedProperties']['private'])
            ->toBe(['lifegui_type' => 'event', 'lifegui_ref' => '']);

        return Http::response([
            'id' => 'avulso',
            'summary' => 'Revisão da semana',
            'start' => ['dateTime' => '2026-09-26T18:00:00-03:00'],
            'end' => ['dateTime' => '2026-09-26T19:00:00-03:00'],
            'extendedProperties' => ['private' => ['lifegui_type' => 'event', 'lifegui_ref' => '']],
        ]);
    });

    $this->postJson('/api/calendar/events', [
        'type' => 'event',
        'title' => 'Revisão da semana',
        'start' => '2026-09-26T18:00:00-03:00',
    ])->assertCreated()->assertJsonPath('data.lifegui.type', 'event');
});
