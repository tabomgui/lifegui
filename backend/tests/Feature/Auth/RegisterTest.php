<?php

use function Pest\Laravel\postJson;

beforeEach(fn () => config(['lifegui.registration_enabled' => true]));

test('usuário consegue se registrar', function () {
    $response = postJson('/api/register', [
        'name' => 'Gui',
        'email' => 'gui@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.email', 'gui@example.com');

    $this->assertDatabaseHas('users', ['email' => 'gui@example.com']);
});

test('registro exige email único', function () {
    \App\Models\User::factory()->create(['email' => 'gui@example.com']);

    postJson('/api/register', [
        'name' => 'Gui',
        'email' => 'gui@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertStatus(422);
});

test('registro responde 403 com cadastro fechado', function () {
    config(['lifegui.registration_enabled' => false]);

    postJson('/api/register', [
        'name' => 'Gui',
        'email' => 'gui@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ])->assertForbidden()
        ->assertJsonPath('message', 'Cadastro desativado nesta instância.');

    $this->assertDatabaseMissing('users', ['email' => 'gui@example.com']);
});

test('cadastro grava o locale enviado', function () {
    config(['lifegui.registration_enabled' => true]);
    \App\Models\User::factory()->create();

    postJson('/api/register', [
        'name' => 'Ana', 'email' => 'ana@x.test',
        'password' => 'secret123', 'password_confirmation' => 'secret123',
        'locale' => 'en',
    ])->assertCreated()->assertJsonPath('data.locale', 'en');
});

test('cadastro rejeita locale inválido', function () {
    config(['lifegui.registration_enabled' => true]);
    \App\Models\User::factory()->create();

    postJson('/api/register', [
        'name' => 'Ana', 'email' => 'ana@x.test',
        'password' => 'secret123', 'password_confirmation' => 'secret123',
        'locale' => 'xx',
    ])->assertStatus(422)->assertJsonValidationErrors('locale');
});
