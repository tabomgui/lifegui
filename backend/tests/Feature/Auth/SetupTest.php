<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;

use function Pest\Laravel\getJson;
use function Pest\Laravel\postJson;

function setupPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Gui',
        'email' => 'gui@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ], $overrides);
}

test('status pede setup quando não há usuários', function () {
    config([
        'lifegui.registration_enabled' => false,
        'services.google.client_id' => null,
        'services.google.client_secret' => null,
    ]);

    getJson('/api/setup/status')
        ->assertOk()
        ->assertExactJson(['data' => [
            'needs_setup' => true,
            'registration_enabled' => false,
            'google_login_enabled' => false,
        ]]);
});

test('status não pede setup quando já existe usuário', function () {
    User::factory()->create();

    getJson('/api/setup/status')
        ->assertOk()
        ->assertJsonPath('data.needs_setup', false);
});

test('status reflete cadastro aberto e login Google configurado', function () {
    config([
        'lifegui.registration_enabled' => true,
        'services.google.client_id' => 'client-id',
        'services.google.client_secret' => 'client-secret',
    ]);

    getJson('/api/setup/status')
        ->assertJsonPath('data.registration_enabled', true)
        ->assertJsonPath('data.google_login_enabled', true);
});

test('setup cria a primeira conta e autentica', function () {
    postJson('/api/setup', setupPayload())
        ->assertCreated()
        ->assertJsonPath('data.email', 'gui@example.com');

    $this->assertDatabaseHas('users', ['email' => 'gui@example.com']);
    $this->assertAuthenticated();
});

test('setup responde 409 quando a instância já tem usuário', function () {
    User::factory()->create();

    postJson('/api/setup', setupPayload(['email' => 'outro@example.com']))
        ->assertStatus(409)
        ->assertJsonPath('message', 'Esta instância já foi configurada.');

    expect(User::count())->toBe(1);
});

test('setup funciona com cadastro público fechado', function () {
    config(['lifegui.registration_enabled' => false]);

    postJson('/api/setup', setupPayload())->assertCreated();
});

test('setup valida os campos', function () {
    postJson('/api/setup', setupPayload(['password_confirmation' => 'diferente']))
        ->assertStatus(422)
        ->assertJsonValidationErrors('password');
});

test('setup responde 409 quando o lock está ocupado', function () {
    $lock = Cache::lock('lifegui:setup', 10);
    $lock->get();

    try {
        postJson('/api/setup', setupPayload())
            ->assertStatus(409)
            ->assertJsonPath('message', 'Configuração em andamento. Tente de novo em instantes.');

        expect(User::count())->toBe(0);
    } finally {
        $lock->forceRelease();
    }
});
