<?php

use App\Models\User;

test('complete grava onboarded_at', function () {
    $user = User::factory()->create(['onboarded_at' => null]);

    $this->actingAs($user)
        ->postJson('/api/onboarding/complete')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);

    expect($user->fresh()->onboarded_at)->not->toBeNull();
});

test('complete é idempotente', function () {
    $at = now()->subDay()->startOfSecond();
    $user = User::factory()->create(['onboarded_at' => $at]);

    $this->actingAs($user)->postJson('/api/onboarding/complete')->assertOk();

    expect($user->fresh()->onboarded_at->equalTo($at))->toBeTrue();
});

test('me expõe onboarded_at', function () {
    $user = User::factory()->create(['onboarded_at' => null]);

    $this->actingAs($user)
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('data.onboarded_at', null);
});

test('complete exige autenticação', function () {
    $this->postJson('/api/onboarding/complete')->assertUnauthorized();
});
