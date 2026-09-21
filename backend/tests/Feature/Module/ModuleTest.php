<?php
use App\Models\User;
use App\Models\UserModule;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('retorna defaults do registry quando não há linhas', function () {
    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.key', 'tasks')
        ->assertJsonPath('data.0.label', 'Tarefas')
        ->assertJsonPath('data.0.icon', 'kanban')
        ->assertJsonPath('data.0.version', '0.1.0')
        ->assertJsonPath('data.0.enabled', true)
        ->assertJsonPath('data.1.key', 'habits')
        ->assertJsonPath('data.1.enabled', true);
});

test('override do usuário é refletido no index', function () {
    UserModule::factory()->for($this->user)->create(['key' => 'habits', 'enabled' => false]);

    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonPath('data.1.key', 'habits')
        ->assertJsonPath('data.1.enabled', false);
});

test('toggle faz upsert e persiste', function () {
    $this->patchJson('/api/modules/habits', ['enabled' => false])
        ->assertOk()
        ->assertJsonPath('data.key', 'habits')
        ->assertJsonPath('data.enabled', false)
        ->assertJsonPath('data.label', 'Hábitos');

    $this->assertDatabaseHas('user_modules', [
        'user_id' => $this->user->id,
        'key' => 'habits',
        'enabled' => false,
    ]);

    // Second toggle updates the same row (upsert, not duplicate).
    $this->patchJson('/api/modules/habits', ['enabled' => true])
        ->assertOk()
        ->assertJsonPath('data.enabled', true);

    expect(UserModule::withoutGlobalScopes()->where('key', 'habits')->count())->toBe(1);
});

test('rejeita módulo desconhecido com 404', function () {
    $this->patchJson('/api/modules/nope', ['enabled' => true])->assertNotFound();
});

test('enabled é obrigatório e booleano', function () {
    $this->patchJson('/api/modules/habits', [])->assertStatus(422);
    $this->patchJson('/api/modules/habits', ['enabled' => 'sim'])->assertStatus(422);
});

test('isolamento de tenant: toggle de A não afeta B', function () {
    $this->patchJson('/api/modules/habits', ['enabled' => false])->assertOk();

    $other = User::factory()->create();
    $this->actingAs($other);

    // B still sees the registry default (habits on).
    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonPath('data.1.key', 'habits')
        ->assertJsonPath('data.1.enabled', true);
});

test('rotas de módulo exigem autenticação', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/modules')->assertUnauthorized();
    $this->patchJson('/api/modules/habits', ['enabled' => true])->assertUnauthorized();
});
