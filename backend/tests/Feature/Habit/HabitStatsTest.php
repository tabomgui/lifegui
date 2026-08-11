<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('hábito diário (sem meta): rate = feitos / dias do período', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => null]);

    // Janela de 7 dias: 2026-08-01 .. 2026-08-07. 3 dias feitos.
    HabitLog::factory()->for($h)->create(['date' => '2026-08-01', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-02', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-03', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-04', 'done' => false]);

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();

    $res->assertJsonPath('data.from', '2026-08-01');
    $res->assertJsonPath('data.to', '2026-08-07');
    $res->assertJsonPath('data.period_days', 7);
    $res->assertJsonPath('data.habits.0.habit_id', $h->id);
    $res->assertJsonPath('data.habits.0.done_count', 3);
    $res->assertJsonPath('data.habits.0.expected', 7);
    $res->assertJsonPath('data.habits.0.rate', 43); // round(3/7*100) = 43
});

test('hábito com meta semanal: rate atinge 100% e é limitado a 100', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => 3]);

    // Janela de 7 dias, expected = 3/7*7 = 3.
    HabitLog::factory()->for($h)->create(['date' => '2026-08-01', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-02', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-03', 'done' => true]);

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();
    $res->assertJsonPath('data.habits.0.expected', 3);
    $res->assertJsonPath('data.habits.0.done_count', 3);
    $res->assertJsonPath('data.habits.0.rate', 100);
});

test('hábito com meta semanal: excesso de dias feitos é capado em 100%, não 200%', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => 3]);

    HabitLog::factory()->for($h)->create(['date' => '2026-08-01', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-02', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-03', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-04', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-05', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-06', 'done' => true]);

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();
    $res->assertJsonPath('data.habits.0.done_count', 6);
    $res->assertJsonPath('data.habits.0.expected', 3);
    $res->assertJsonPath('data.habits.0.rate', 100);
});

test('hábitos arquivados são excluídos', function () {
    Habit::factory()->for($this->user)->create(['archived_at' => now()]);
    $active = Habit::factory()->for($this->user)->create();

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();

    $res->assertJsonCount(1, 'data.habits');
    $res->assertJsonPath('data.habits.0.habit_id', $active->id);
});

test('somente hábitos do usuário autenticado aparecem', function () {
    $other = User::factory()->create();
    $otherHabit = Habit::factory()->for($other)->create();
    HabitLog::factory()->for($otherHabit)->create(['date' => '2026-08-01', 'done' => true]);

    $mine = Habit::factory()->for($this->user)->create();

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();

    $res->assertJsonCount(1, 'data.habits');
    $res->assertJsonPath('data.habits.0.habit_id', $mine->id);
});

test('resposta traz name/color/icon/target_per_week/done_count/expected/rate por hábito', function () {
    $h = Habit::factory()->for($this->user)->create([
        'name' => 'Ler',
        'color' => '#ff0000',
        'icon' => 'book',
        'target_per_week' => 5,
    ]);

    $res = $this->getJson('/api/habits/stats?from=2026-08-01&to=2026-08-07')->assertOk();

    $res->assertJsonPath('data.habits.0.name', 'Ler');
    $res->assertJsonPath('data.habits.0.color', '#ff0000');
    $res->assertJsonPath('data.habits.0.icon', 'book');
    $res->assertJsonPath('data.habits.0.target_per_week', 5);
    $res->assertJsonPath('data.habits.0.done_count', 0);
    $res->assertJsonPath('data.habits.0.expected', 5);
    $res->assertJsonPath('data.habits.0.rate', 0);
});

test('from ausente é rejeitado (422)', function () {
    $this->getJson('/api/habits/stats?to=2026-08-07')->assertStatus(422);
});

test('to ausente é rejeitado (422)', function () {
    $this->getJson('/api/habits/stats?from=2026-08-01')->assertStatus(422);
});

test('from com formato inválido é rejeitado (422)', function () {
    $this->getJson('/api/habits/stats?from=2026-08-xx&to=2026-08-07')->assertStatus(422);
});

test('to com formato inválido é rejeitado (422)', function () {
    $this->getJson('/api/habits/stats?from=2026-08-01&to=xx')->assertStatus(422);
});

test('to antes de from é rejeitado (422)', function () {
    $this->getJson('/api/habits/stats?from=2026-08-07&to=2026-08-01')->assertStatus(422);
});

test('janela maior que 366 dias é rejeitada (422)', function () {
    // 2025 não é bissexto: 2025-01-01 .. 2026-01-03 = 367 dias.
    $this->getJson('/api/habits/stats?from=2025-01-01&to=2026-01-03')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('janela de exatos 366 dias é aceita', function () {
    // 2024 é bissexto: 2024-01-01 .. 2025-01-01 = 366 dias.
    $this->getJson('/api/habits/stats?from=2024-01-01&to=2025-01-01')->assertOk();
});
