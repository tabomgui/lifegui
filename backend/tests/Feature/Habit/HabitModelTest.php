<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;

test('habit pertence ao usuário e tem logs; global scope isola', function () {
    $me = User::factory()->create();
    $other = User::factory()->create();
    Habit::factory()->for($me)->create(['name' => 'Ler']);
    Habit::factory()->for($other)->create(['name' => 'Correr']);

    $this->actingAs($me);
    expect(Habit::count())->toBe(1);
    expect(Habit::first()->name)->toBe('Ler');
});

test('apagar habit remove seus logs (cascade)', function () {
    $me = User::factory()->create();
    $this->actingAs($me);
    $habit = Habit::factory()->for($me)->create();
    HabitLog::factory()->for($habit)->create(['date' => '2026-08-10', 'done' => true]);

    $habit->delete();

    expect(HabitLog::where('habit_id', $habit->id)->count())->toBe(0);
});

test('target_per_week pode ser null (sem meta)', function () {
    $me = User::factory()->create();
    $this->actingAs($me);
    $habit = Habit::factory()->for($me)->create(['target_per_week' => null]);
    expect($habit->target_per_week)->toBeNull();
});
