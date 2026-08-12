<?php

use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;
use Illuminate\Support\Carbon;

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

test('dois toggles seguidos na mesma data voltam ao estado inicial', function () {
    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()->assertJsonPath('data.done', true);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()->assertJsonPath('data.done', false);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()->assertJsonPath('data.done', true);

    expect(HabitLog::where('habit_id', $h->id)->where('date', '2026-08-10')->count())->toBe(1);
});

test('não permite toggle em data futura', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11'));

    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => Carbon::now()->addDays(5)->toDateString()])
        ->assertStatus(422)
        ->assertJsonValidationErrors('date');

    Carbon::setTestNow();
});

test('permite toggle em hoje', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11'));

    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => Carbon::now()->toDateString()])
        ->assertOk()
        ->assertJsonPath('data.done', true);

    Carbon::setTestNow();
});

test('permite toggle em amanhã (tolerância de fuso)', function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11'));

    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => Carbon::now()->addDay()->toDateString()])
        ->assertOk()
        ->assertJsonPath('data.done', true);

    Carbon::setTestNow();
});

test('state=done cria log done e skipped=false', function () {
    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'done'])
        ->assertOk()
        ->assertJsonPath('data.done', true)
        ->assertJsonPath('data.skipped', false);

    $this->assertDatabaseHas('habit_logs', ['habit_id' => $h->id, 'date' => '2026-08-10', 'done' => true, 'skipped' => false]);
});

test('state=skip cria log skipped e done=false', function () {
    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'skip'])
        ->assertOk()
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.skipped', true);

    $this->assertDatabaseHas('habit_logs', ['habit_id' => $h->id, 'date' => '2026-08-10', 'done' => false, 'skipped' => true]);
});

test('state=skip sobre um done vira skip', function () {
    $h = Habit::factory()->for($this->user)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => true, 'skipped' => false]);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'skip'])
        ->assertOk()
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.skipped', true);

    expect(HabitLog::where('habit_id', $h->id)->where('date', '2026-08-10')->count())->toBe(1);
});

test('state=none apaga o log do dia', function () {
    $h = Habit::factory()->for($this->user)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => false, 'skipped' => true]);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'none'])
        ->assertOk()
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.skipped', false)
        ->assertJsonPath('data.date', '2026-08-10');

    $this->assertDatabaseMissing('habit_logs', ['habit_id' => $h->id, 'date' => '2026-08-10']);
});

test('state=none em dia sem log não quebra', function () {
    $h = Habit::factory()->for($this->user)->create();

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'none'])
        ->assertOk()
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.skipped', false);

    expect(HabitLog::where('habit_id', $h->id)->count())->toBe(0);
});

test('toggle sem state zera skipped ao inverter done', function () {
    $h = Habit::factory()->for($this->user)->create();
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => false, 'skipped' => true]);

    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10'])
        ->assertOk()
        ->assertJsonPath('data.done', true)
        ->assertJsonPath('data.skipped', false);
});

test('state inválido é rejeitado (422)', function () {
    $h = Habit::factory()->for($this->user)->create();
    $this->postJson("/api/habits/{$h->id}/toggle", ['date' => '2026-08-10', 'state' => 'wat'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('state');
});
