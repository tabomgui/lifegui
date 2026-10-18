<?php

use App\Models\User;

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
    User::factory()->create(['email' => 'gui@example.com']);

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
    ], ['Accept-Language' => 'pt-BR'])->assertForbidden()
        ->assertJsonPath('message', 'Cadastro desativado nesta instância.');

    $this->assertDatabaseMissing('users', ['email' => 'gui@example.com']);
});

test('registro fechado responde em inglês pelo Accept-Language', function () {
    config(['lifegui.registration_enabled' => false]);

    postJson('/api/register', [
        'name' => 'Gui',
        'email' => 'gui@example.com',
        'password' => 'password123',
        'password_confirmation' => 'password123',
    ], ['Accept-Language' => 'en'])->assertForbidden()
        ->assertJsonPath('message', 'Sign-up is disabled on this instance.');

    $this->assertDatabaseMissing('users', ['email' => 'gui@example.com']);
});

test('cadastro grava o locale enviado', function () {
    User::factory()->create();

    postJson('/api/register', [
        'name' => 'Ana', 'email' => 'ana@x.test',
        'password' => 'secret123', 'password_confirmation' => 'secret123',
        'locale' => 'pt-BR',
    ])->assertCreated()->assertJsonPath('data.locale', 'pt-BR');
});

test('cadastro sem locale usa o Accept-Language', function () {
    User::factory()->create();

    postJson('/api/register', [
        'name' => 'Ana', 'email' => 'ana@x.test',
        'password' => 'secret123', 'password_confirmation' => 'secret123',
    ], ['Accept-Language' => 'pt-BR'])->assertCreated()->assertJsonPath('data.locale', 'pt-BR');
});

test('cadastro rejeita locale inválido', function () {
    User::factory()->create();

    postJson('/api/register', [
        'name' => 'Ana', 'email' => 'ana@x.test',
        'password' => 'secret123', 'password_confirmation' => 'secret123',
        'locale' => 'xx',
    ])->assertStatus(422)->assertJsonValidationErrors('locale');
});
