<?php

use App\Models\Habit;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('lista hábitos não arquivados', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Ativo']);
    Habit::factory()->for($this->user)->create(['name' => 'Arquivado', 'archived_at' => now()]);

    $this->getJson('/api/habits')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Ativo');
});

test('cria hábito com meta opcional', function () {
    $this->postJson('/api/habits', ['name' => 'Treino', 'icon' => 'dumbbell', 'target_per_week' => 3])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Treino')
        ->assertJsonPath('data.icon', 'dumbbell')
        ->assertJsonPath('data.target_per_week', 3);

    $this->assertDatabaseHas('habits', ['name' => 'Treino', 'user_id' => $this->user->id]);
});

test('cria hábito sem meta (target null)', function () {
    $this->postJson('/api/habits', ['name' => 'Ler'])
        ->assertCreated()
        ->assertJsonPath('data.target_per_week', null);
});

test('nome obrigatório; meta entre 1 e 7', function () {
    $this->postJson('/api/habits', ['name' => ''])->assertStatus(422);
    $this->postJson('/api/habits', ['name' => 'x', 'target_per_week' => 0])->assertStatus(422);
    $this->postJson('/api/habits', ['name' => 'x', 'target_per_week' => 8])->assertStatus(422);
});

test('atualiza hábito', function () {
    $h = Habit::factory()->for($this->user)->create(['name' => 'Velho']);
    $this->patchJson("/api/habits/{$h->id}", ['name' => 'Novo', 'target_per_week' => 5])
        ->assertOk()
        ->assertJsonPath('data.name', 'Novo')
        ->assertJsonPath('data.target_per_week', 5);
});

test('apaga hábito', function () {
    $h = Habit::factory()->for($this->user)->create();
    $this->deleteJson("/api/habits/{$h->id}")->assertNoContent();
    $this->assertDatabaseMissing('habits', ['id' => $h->id]);
});

test('não acessa hábito de outro usuário (404)', function () {
    $other = Habit::factory()->for(User::factory())->create();
    $this->patchJson("/api/habits/{$other->id}", ['name' => 'x'])->assertNotFound();
    $this->deleteJson("/api/habits/{$other->id}")->assertNotFound();
});

test('archive define archived_at e tira da lista padrão', function () {
    $h = Habit::factory()->for($this->user)->create(['name' => 'Ativo']);

    $this->postJson("/api/habits/{$h->id}/archive")
        ->assertOk()
        ->assertJsonPath('data.id', $h->id);

    expect($h->fresh()->archived_at)->not->toBeNull();

    $this->getJson('/api/habits')->assertOk()->assertJsonCount(0, 'data');
});

test('unarchive limpa archived_at e devolve à lista padrão', function () {
    $h = Habit::factory()->for($this->user)->create(['name' => 'Ativo', 'archived_at' => now()]);

    $this->postJson("/api/habits/{$h->id}/unarchive")
        ->assertOk()
        ->assertJsonPath('data.id', $h->id)
        ->assertJsonPath('data.archived_at', null);

    expect($h->fresh()->archived_at)->toBeNull();

    $this->getJson('/api/habits')->assertOk()->assertJsonCount(1, 'data');
});

test('?archived=1 lista apenas arquivados', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Ativo']);
    $arch = Habit::factory()->for($this->user)->create(['name' => 'Arquivado', 'archived_at' => now()]);

    $this->getJson('/api/habits?archived=1')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Arquivado');

    // e o recurso expõe archived_at como ISO string
    $this->getJson('/api/habits?archived=1')
        ->assertJsonPath('data.0.archived_at', fn ($v) => is_string($v));
});

test('não arquiva hábito de outro usuário (404)', function () {
    $other = Habit::factory()->for(User::factory())->create();
    $this->postJson("/api/habits/{$other->id}/archive")->assertNotFound();
    $this->postJson("/api/habits/{$other->id}/unarchive")->assertNotFound();
});
