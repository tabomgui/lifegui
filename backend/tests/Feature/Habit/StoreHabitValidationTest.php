<?php

use App\Models\User;

test('cadastro de hábito negativo exige estimated_daily_cost', function () {
    $user = User::factory()->create();
    $response = $this->actingAs($user)->postJson('/api/habits', [
        'name' => 'Fumar',
        'type' => 'negative',
    ]);

    $response->assertStatus(422)->assertJsonValidationErrors('estimated_daily_cost');
});

test('cadastro de hábito negativo com estimated_daily_cost passa', function () {
    $user = User::factory()->create();
    $response = $this->actingAs($user)->postJson('/api/habits', [
        'name' => 'Fumar',
        'type' => 'negative',
        'estimated_daily_cost' => 12.5,
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('data.type', 'negative')
        ->assertJsonPath('data.estimated_daily_cost', '12.50');
});

test('type default é positive quando omitido', function () {
    $user = User::factory()->create();
    $response = $this->actingAs($user)->postJson('/api/habits', ['name' => 'Ler']);

    $response->assertStatus(201)->assertJsonPath('data.type', 'positive');
});
