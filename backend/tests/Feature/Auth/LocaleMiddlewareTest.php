<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

beforeEach(function () {
    Route::middleware('api')->get('/api/_locale-test', fn () => ['locale' => app()->getLocale()]);
    Route::middleware(['api', 'auth:sanctum'])->get('/api/_locale-auth-test', fn () => ['locale' => app()->getLocale()]);
});

test('sem login usa o Accept-Language', function () {
    $this->getJson('/api/_locale-test', ['Accept-Language' => 'pt-BR,pt;q=0.9'])
        ->assertJsonPath('locale', 'pt_BR');
    $this->getJson('/api/_locale-test', ['Accept-Language' => 'en-US'])
        ->assertJsonPath('locale', 'en');
});

test('sem login e sem header cai no padrão en', function () {
    $this->getJson('/api/_locale-test', ['Accept-Language' => ''])
        ->assertJsonPath('locale', 'en');
});

test('com login o locale do usuário vence o header', function () {
    $user = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)
        ->getJson('/api/_locale-auth-test', ['Accept-Language' => 'pt-BR'])
        ->assertJsonPath('locale', 'en');

    $user->update(['locale' => 'pt-BR']);

    $this->actingAs($user)
        ->getJson('/api/_locale-auth-test', ['Accept-Language' => 'en'])
        ->assertJsonPath('locale', 'pt_BR');
});
