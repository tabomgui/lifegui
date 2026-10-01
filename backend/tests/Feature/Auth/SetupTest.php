<?php

use App\Models\User;

use function Pest\Laravel\getJson;

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
