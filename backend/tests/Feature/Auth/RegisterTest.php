<?php

use function Pest\Laravel\postJson;

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
