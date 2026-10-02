<?php

use App\Models\User;

test('usuário troca o próprio idioma', function () {
    $user = User::factory()->create(['locale' => 'pt-BR']);

    $this->actingAs($user)->patchJson('/api/me', ['locale' => 'en'])
        ->assertOk()
        ->assertJsonPath('data.locale', 'en');

    expect($user->fresh()->locale)->toBe('en');
});

test('rejeita idioma não suportado', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->patchJson('/api/me', ['locale' => 'fr'])
        ->assertStatus(422)
        ->assertJsonValidationErrors('locale');
});

test('ignora outros campos', function () {
    $user = User::factory()->create(['name' => 'Gui']);

    $this->actingAs($user)->patchJson('/api/me', ['locale' => 'en', 'name' => 'Outro'])->assertOk();

    expect($user->fresh()->name)->toBe('Gui');
});

test('exige login', function () {
    $this->patchJson('/api/me', ['locale' => 'en'])->assertStatus(401);
});

test('token de captura não troca idioma', function () {
    $user = User::factory()->create();
    $token = $user->createToken('atalho', ['brain:capture'])->plainTextToken;

    $this->withToken($token)->patchJson('/api/me', ['locale' => 'en'])->assertStatus(403);
});
