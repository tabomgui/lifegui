<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('heatmap conta hábitos concluídos por dia', function () {
    $a = Habit::factory()->for($this->user)->create();
    $b = Habit::factory()->for($this->user)->create();

    // Dois hábitos feitos no mesmo dia -> count 2.
    HabitLog::factory()->for($a)->create(['date' => '2026-08-10', 'done' => true]);
    HabitLog::factory()->for($b)->create(['date' => '2026-08-10', 'done' => true]);
    HabitLog::factory()->for($a)->create(['date' => '2026-08-11', 'done' => true]);
    // Não feito / pulado não contam.
    HabitLog::factory()->for($b)->create(['date' => '2026-08-11', 'done' => false, 'skipped' => true]);

    $response = $this->getJson('/api/habits/heatmap?from=2026-08-01&to=2026-08-31')->assertOk();

    $response->assertJsonPath('data.counts.2026-08-10', 2);
    $response->assertJsonPath('data.counts.2026-08-11', 1);
    $response->assertJsonPath('data.total', 3);
});

test('heatmap só conta hábitos do usuário autenticado', function () {
    $other = User::factory()->create();
    $h = Habit::factory()->for($other)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => true]);

    $response = $this->getJson('/api/habits/heatmap?from=2026-08-01&to=2026-08-31')->assertOk();

    $response->assertJsonPath('data.total', 0);
    // counts vazio precisa serializar como objeto ({}), não array ([]).
    expect($response->json('data.counts'))->toBe([]);
    expect($response->baseResponse->getContent())->toContain('"counts":{}');
});

test('heatmap com from/to retorna só conclusões dentro da janela', function () {
    $h = Habit::factory()->for($this->user)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-05', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-08', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-20', 'done' => true]); // fora

    $response = $this->getJson('/api/habits/heatmap?from=2026-08-05&to=2026-08-08')->assertOk();

    $response->assertJsonPath('data.from', '2026-08-05');
    $response->assertJsonPath('data.to', '2026-08-08');
    $response->assertJsonPath('data.total', 2);
});

test('heatmap rejeita janela maior que 400 dias', function () {
    // Factory default é pt-BR (ver UserFactory).
    $this->getJson('/api/habits/heatmap?from=2025-01-01&to=2026-08-11')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to')
        ->assertJsonPath('errors.to.0', 'Período máximo de 400 dias.');
});

test('heatmap rejeita janela maior que 400 dias em inglês pelo idioma do usuário', function () {
    $this->user->update(['locale' => 'en']);

    $this->getJson('/api/habits/heatmap?from=2025-01-01&to=2026-08-11')
        ->assertStatus(422)
        ->assertJsonPath('errors.to.0', 'Maximum period of 400 days.');
});
