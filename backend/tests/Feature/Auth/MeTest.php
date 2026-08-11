<?php

use App\Models\User;
use function Pest\Laravel\getJson;

test('/me retorna o usuário autenticado', function () {
    $user = User::factory()->create(['email' => 'gui@example.com']);

    $this->actingAs($user)->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.email', 'gui@example.com');
});

test('/me exige autenticação', function () {
    getJson('/api/me')->assertUnauthorized();
});
