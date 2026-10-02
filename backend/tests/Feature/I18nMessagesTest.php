<?php

use App\Models\User;

test('validação responde no idioma do usuário', function () {
    $en = User::factory()->create(['locale' => 'en']);
    $pt = User::factory()->create(['locale' => 'pt-BR']);

    $enMessage = $this->actingAs($en)->postJson('/api/habits', [])->assertStatus(422)->json('errors.name.0');
    $ptMessage = $this->actingAs($pt)->postJson('/api/habits', [])->assertStatus(422)->json('errors.name.0');

    // O texto exato vem do pacote laravel-lang/common (ex.: "É obrigatória a indicação
    // de um valor para o campo nome."); checamos o radical para não depender da flexão.
    expect($enMessage)->toContain('required')
        ->and($ptMessage)->toContain('obrigat');
});

test('setup já feito responde no idioma do Accept-Language', function () {
    User::factory()->create();
    $payload = ['name' => 'X', 'email' => 'x@x.test', 'password' => 'secret123', 'password_confirmation' => 'secret123'];

    $this->postJson('/api/setup', $payload, ['Accept-Language' => 'en'])
        ->assertStatus(409)->assertJsonPath('message', 'This instance is already set up.');
    $this->postJson('/api/setup', $payload, ['Accept-Language' => 'pt-BR'])
        ->assertStatus(409)->assertJsonPath('message', 'Esta instância já foi configurada.');
});

test('login inválido responde no idioma do Accept-Language', function () {
    $this->postJson('/api/login', ['email' => 'a@x.test', 'password' => 'errada'], ['Accept-Language' => 'en'])
        ->assertStatus(422)->assertJsonPath('errors.email.0', 'Invalid credentials.');
});

test('rótulos de módulo seguem o idioma do usuário', function () {
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)->getJson('/api/modules')
        ->assertOk()
        ->assertJsonFragment(['label' => 'Tasks']);
});
