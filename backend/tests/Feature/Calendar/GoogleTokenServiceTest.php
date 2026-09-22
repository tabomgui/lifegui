<?php

use App\Models\User;
use App\Support\Calendar\CalendarNotConnectedException;
use App\Support\Calendar\GoogleTokenService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
});

it('lança CalendarNotConnected quando o usuário não tem refresh token', function () {
    $user = User::factory()->create();

    app(GoogleTokenService::class)->accessToken($user);
})->throws(CalendarNotConnectedException::class);

it('troca o refresh token por access token e guarda em cache', function () {
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['access_token' => 'at-123', 'expires_in' => 3599]),
    ]);

    $user = User::factory()->create(['google_calendar_refresh_token' => 'rt-abc']);
    $service = app(GoogleTokenService::class);

    expect($service->accessToken($user))->toBe('at-123');
    expect($service->accessToken($user))->toBe('at-123');

    Http::assertSentCount(1);
    Http::assertSent(function ($request) {
        return $request->url() === 'https://oauth2.googleapis.com/token'
            && $request['grant_type'] === 'refresh_token'
            && $request['refresh_token'] === 'rt-abc';
    });
});

it('limpa a conexão e lança quando o Google responde invalid_grant', function () {
    Http::fake([
        'oauth2.googleapis.com/token' => Http::response(['error' => 'invalid_grant'], 400),
    ]);

    $user = User::factory()->create([
        'google_calendar_refresh_token' => 'rt-revogado',
        'google_calendar_connected_at' => now(),
    ]);

    expect(fn () => app(GoogleTokenService::class)->accessToken($user))
        ->toThrow(CalendarNotConnectedException::class);

    $user->refresh();
    expect($user->google_calendar_refresh_token)->toBeNull()
        ->and($user->google_calendar_connected_at)->toBeNull();
});

it('desconecta revogando o token no Google e limpando as colunas', function () {
    Http::fake([
        'oauth2.googleapis.com/revoke' => Http::response([], 200),
    ]);

    $user = User::factory()->create([
        'google_calendar_refresh_token' => 'rt-abc',
        'google_calendar_connected_at' => now(),
    ]);

    app(GoogleTokenService::class)->disconnect($user);

    Http::assertSent(fn ($request) => $request->url() === 'https://oauth2.googleapis.com/revoke');
    $user->refresh();
    expect($user->google_calendar_refresh_token)->toBeNull()
        ->and($user->google_calendar_connected_at)->toBeNull();
});

it('a exceção renderiza como 409 com mensagem clara', function () {
    $response = (new CalendarNotConnectedException)->render();

    expect($response->getStatusCode())->toBe(409)
        ->and($response->getData(true)['message'])->toContain('não conectado');
});
