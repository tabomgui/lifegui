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
