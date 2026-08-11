<?php
use App\Models\User;
use App\Models\UserModule;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('retorna defaults do registry quando não há linhas', function () {
    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.key', 'tasks')
        ->assertJsonPath('data.0.label', 'Tarefas')
        ->assertJsonPath('data.0.icon', 'kanban')
        ->assertJsonPath('data.0.version', '0.1.0')
        ->assertJsonPath('data.0.enabled', true)
        ->assertJsonPath('data.1.key', 'habits')
        ->assertJsonPath('data.1.enabled', true)
        ->assertJsonPath('data.2.enabled', false);
});

test('override do usuário é refletido no index', function () {

    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonPath('data.2.enabled', true);
});

test('toggle faz upsert e persiste', function () {
        ->assertOk()
        ->assertJsonPath('data.enabled', true)

    $this->assertDatabaseHas('user_modules', [
        'user_id' => $this->user->id,
        'enabled' => true,
    ]);

    // Second toggle updates the same row (upsert, not duplicate).
        ->assertOk()
        ->assertJsonPath('data.enabled', false);

});

test('rejeita módulo desconhecido com 404', function () {
    $this->patchJson('/api/modules/nope', ['enabled' => true])->assertNotFound();
});

test('enabled é obrigatório e booleano', function () {
});

test('isolamento de tenant: toggle de A não afeta B', function () {

    $other = User::factory()->create();
    $this->actingAs($other);

    $this->getJson('/api/modules')
        ->assertOk()
        ->assertJsonPath('data.2.enabled', false);
});

test('rotas de módulo exigem autenticação', function () {
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/modules')->assertUnauthorized();
});
