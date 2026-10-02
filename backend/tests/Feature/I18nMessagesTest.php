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
