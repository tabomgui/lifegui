<?php

use App\Mcp\Servers\LifeguiServer;
use App\Mcp\Tools\CompleteHabitTool;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;
use Illuminate\Support\Carbon;

afterEach(fn () => Carbon::setTestNow());

test('usuário salva o próprio fuso', function () {
    $user = User::factory()->create(['timezone' => 'UTC']);

    $this->actingAs($user)->patchJson('/api/me', ['timezone' => 'America/Sao_Paulo'])
        ->assertOk()
        ->assertJsonPath('data.timezone', 'America/Sao_Paulo');

    expect($user->fresh()->timezone)->toBe('America/Sao_Paulo');
});

test('rejeita fuso inválido', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/me', ['timezone' => 'Marte/Olympus'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('timezone');
});

test('PATCH /me exige idioma ou fuso', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/me', [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['locale', 'timezone']);
});

test('hoje do servidor segue o fuso do usuário, não UTC', function () {
    // 22h de quinta em São Paulo = 01h de sexta em UTC.
    Carbon::setTestNow('2026-08-14 01:00:00');
    $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);

    expect($user->localToday())->toBe('2026-08-13');
});

test('streak da página de hábitos não perde o dia depois das 21h em São Paulo', function () {
    Carbon::setTestNow('2026-08-14 01:00:00'); // quinta 22h em SP
    $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
    $h = Habit::factory()->for($user)->create();
    // Quarta feita; quinta (hoje em SP) ainda sem log: dia de graça mantém 1.
    HabitLog::factory()->for($h)->create(['date' => '2026-08-12', 'done' => true, 'skipped' => false]);

    $this->actingAs($user)->getJson('/api/habits/summary?week=2026-08-10')
        ->assertOk()
        ->assertJsonPath('data.0.streak', 1);
});

test('complete_habit marca o dia local do usuário', function () {
    Carbon::setTestNow('2026-08-14 01:00:00'); // quinta 22h em SP
    $user = User::factory()->create(['timezone' => 'America/Sao_Paulo']);
    $h = Habit::factory()->for($user)->create(['name' => 'Leitura']);

    LifeguiServer::actingAs($user)->tool(CompleteHabitTool::class, ['name' => 'Leitura'])->assertOk();

    expect($h->logs()->first()->date->toDateString())->toBe('2026-08-13');
});
