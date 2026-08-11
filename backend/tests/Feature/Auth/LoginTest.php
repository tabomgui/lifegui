<?php

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use function Pest\Laravel\postJson;

test('usuário loga com credenciais válidas', function () {
    User::factory()->create([
        'email' => 'gui@example.com',
        'password' => Hash::make('password123'),
    ]);

    postJson('/api/login', [
        'email' => 'gui@example.com',
        'password' => 'password123',
    ])->assertOk()->assertJsonPath('data.email', 'gui@example.com');
});

test('login falha com senha errada', function () {
    User::factory()->create([
        'email' => 'gui@example.com',
        'password' => Hash::make('password123'),
    ]);

    postJson('/api/login', [
        'email' => 'gui@example.com',
        'password' => 'errada',
    ])->assertStatus(422);
});

test('logout encerra a sessão', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/api/logout')->assertNoContent();
});
