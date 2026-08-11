<?php
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('heatmap agrupa tarefas concluídas por dia', function () {
    $today = Carbon::now()->startOfDay()->addHours(10);
    $yesterday = $today->copy()->subDay();

    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => $today]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => $today->copy()->addHour()]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => $yesterday]);

    $response = $this->getJson('/api/tasks/heatmap')->assertOk();

    $todayKey = $today->toDateString();
    $yesterdayKey = $yesterday->toDateString();

    $response->assertJsonPath("data.counts.{$todayKey}", 2);
    $response->assertJsonPath("data.counts.{$yesterdayKey}", 1);
    $response->assertJsonPath('data.total', 3);
});

test('heatmap só conta tarefas do usuário autenticado', function () {
    $other = User::factory()->create();
    Task::factory()->for($other)->create(['status' => 'done', 'completed_at' => now()]);

    $response = $this->getJson('/api/tasks/heatmap')->assertOk();

    $response->assertJsonPath('data.total', 0);
    // counts must serialize as an empty JSON object ({}), not an array ([]),
    // to match the frontend's Record<string, number> contract.
    expect($response->json('data.counts'))->toBe([]);
    expect($response->baseResponse->getContent())->toContain('"counts":{}');
});

test('heatmap exclui tarefas concluídas fora da janela de 370 dias', function () {
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => now()->subDays(400)]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => now()->subDays(10)]);

    $response = $this->getJson('/api/tasks/heatmap')->assertOk();

    $response->assertJsonPath('data.total', 1);
});

test('heatmap ignora tarefas sem completed_at', function () {
    Task::factory()->for($this->user)->create(['status' => 'todo', 'completed_at' => null]);

    $response = $this->getJson('/api/tasks/heatmap')->assertOk();

    $response->assertJsonPath('data.total', 0);
});

test('heatmap com from/to retorna só conclusões dentro da janela', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11 12:00:00', 'UTC'));

    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-05 10:00:00', 'UTC')]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-08 10:00:00', 'UTC')]);
    // Fora da janela [2026-08-05, 2026-08-08].
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-01 10:00:00', 'UTC')]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-10 10:00:00', 'UTC')]);

    $response = $this->getJson('/api/tasks/heatmap?from=2026-08-05&to=2026-08-08&tz=UTC')->assertOk();

    $response->assertJsonPath('data.from', '2026-08-05');
    $response->assertJsonPath('data.to', '2026-08-08');
    $response->assertJsonPath('data.counts.2026-08-05', 1);
    $response->assertJsonPath('data.counts.2026-08-08', 1);
    $response->assertJsonPath('data.total', 2);

    Carbon::setTestNow();
});

test('heatmap rejeita janela maior que 400 dias', function () {
    $this->getJson('/api/tasks/heatmap?from=2025-01-01&to=2026-08-11')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('heatmap rejeita to anterior a from', function () {
    $this->getJson('/api/tasks/heatmap?from=2026-08-11&to=2026-08-01')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('heatmap agrupa pelo fuso do cliente, não UTC', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11 12:00:00', 'UTC'));

    // 2026-08-11 02:00 UTC is 2026-08-10 23:00 in America/Sao_Paulo (UTC-3):
    // grouping by raw UTC date would bucket it on the 11th instead of the 10th.
    $task = Task::factory()->for($this->user)->create([
        'status' => 'done',
        'completed_at' => Carbon::parse('2026-08-11 02:00:00', 'UTC'),
    ]);

    $response = $this->getJson('/api/tasks/heatmap?tz=America/Sao_Paulo')->assertOk();

    $response->assertJsonPath('data.counts.2026-08-10', 1);
    $response->assertJsonPath('data.total', 1);
    $response->assertJsonMissingPath('data.counts.2026-08-11');

    Carbon::setTestNow();
});
