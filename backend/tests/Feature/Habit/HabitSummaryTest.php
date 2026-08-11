<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('summary retorna 7 dias da semana com done e a contagem', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => 3]);
    // Semana começando segunda 2026-08-10 (segunda-feira).
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-12', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-13', 'done' => false]);

    $res = $this->getJson('/api/habits/summary?week=2026-08-10')->assertOk();

    $res->assertJsonPath('data.0.habit_id', $h->id);
    $res->assertJsonPath('data.0.target_per_week', 3);
    $res->assertJsonPath('data.0.done_count', 2);
    // 7 dias, começando na segunda pedida
    $res->assertJsonCount(7, 'data.0.days');
    $res->assertJsonPath('data.0.days.0.date', '2026-08-10');
    $res->assertJsonPath('data.0.days.0.done', true);
    $res->assertJsonPath('data.0.days.1.done', false); // terça sem log
});

test('streak conta dias consecutivos feitos terminando hoje (ou ontem)', function () {
    Carbon::setTestNow('2026-08-13'); // quinta
    $h = Habit::factory()->for($this->user)->create();
    // seg, ter, qua feitos; hoje (qui) ainda não
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-11', 'done' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-12', 'done' => true]);

    $this->getJson('/api/habits/summary?week=2026-08-10')
        ->assertOk()
        ->assertJsonPath('data.0.streak', 3);

    Carbon::setTestNow();
});

test('week inválida é rejeitada (422)', function () {
    $this->getJson('/api/habits/summary?week=xx')->assertStatus(422);
});
