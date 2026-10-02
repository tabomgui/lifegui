<?php

use App\Http\Middleware\SetLocale;
use App\Models\User;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Contracts\Http\Kernel;
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

test('sem login e sem header cai no APP_LOCALE da instância, não sempre en', function () {
    config(['app.locale' => 'pt_BR']);

    $this->getJson('/api/_locale-test', ['Accept-Language' => ''])
        ->assertJsonPath('locale', 'pt_BR');
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

test('com token Sanctum de verdade o locale do usuário também vence o header', function () {
    $user = User::factory()->create(['locale' => 'en']);
    $token = $user->createToken('t')->plainTextToken;

    $this->withToken($token)
        ->getJson('/api/_locale-auth-test', ['Accept-Language' => 'pt-BR'])
        ->assertJsonPath('locale', 'en');
});

test('SetLocale está na lista de prioridade de middleware, depois da autenticação', function () {
    // gatherRouteMiddleware() não serve pra provar isso: nas rotas da API o
    // SubstituteBindings fica entre o SetLocale (appendToGroup) e o auth:sanctum,
    // e o reordenamento dele já arrasta o SetLocale pra depois da autenticação
    // mesmo sem o appendToPriorityList. Testamos a lista de prioridade em si.
    $kernel = app(Kernel::class);
    $property = new ReflectionProperty($kernel, 'middlewarePriority');
    $property->setAccessible(true);
    $priority = $property->getValue($kernel);

    $authIndex = array_search(AuthenticatesRequests::class, $priority, true);
    $localeIndex = array_search(SetLocale::class, $priority, true);

    expect($authIndex)->not->toBeFalse()
        ->and($localeIndex)->not->toBeFalse()
        ->and($localeIndex)->toBeGreaterThan($authIndex);
});
