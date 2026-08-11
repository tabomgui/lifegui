<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('toggle cria log done=true na primeira vez', function () {
    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()
        ->assertJsonPath('data.done', true)
        ->assertJsonPath('data.date', '2026-08-10');

    $this->assertDatabaseHas('habit_logs', ['habit_id' => $h->id, 'date' => '2026-08-10', 'done' => true]);
});

test('toggle na mesma data inverte done', function () {
    $h = Habit::factory()->for($this->user)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => true]);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()
        ->assertJsonPath('data.done', false);
});

test('date é obrigatória e válida', function () {
    $h = Habit::factory()->for($this->user)->create();
    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => 'nao-e-data'])->assertStatus(422);
});

test('não faz toggle em hábito de outro usuário (404)', function () {
    $other = Habit::factory()->for(User::factory())->create();
    $this->postJson("/api/habits/{$other->id}/toggle", ['date' => '2026-08-10'])->assertNotFound();
});
