<?php

namespace App\Support\Calendar;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Gerencia o token de acesso do Google Calendar por usuário: o refresh token
 * vive criptografado na tabela users; o access token (curto) fica em cache.
 */
class GoogleTokenService
{
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

    public function accessToken(User $user): string
    {
        if (! $user->google_calendar_refresh_token) {
            throw new CalendarNotConnectedException;
        }

        // Access token do Google dura 60 min; 55 deixa folga pra requests em voo.
        return Cache::remember(
            "gcal-token:{$user->id}",
            now()->addMinutes(55),
            fn () => $this->refresh($user),
        );
    }

    public function disconnect(User $user): void
    {
        if ($user->google_calendar_refresh_token) {
            // Revogação é best-effort: se o Google falhar, desconecta localmente
            // mesmo assim (o usuário pode revogar pelo painel do Google).
            Http::asForm()->post(self::REVOKE_URL, ['token' => $user->google_calendar_refresh_token]);
        }

        $this->forget($user);
    }

    private function refresh(User $user): string
    {
        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $user->google_calendar_refresh_token,
            'grant_type' => 'refresh_token',
        ]);

        if ($response->failed()) {
            // invalid_grant = usuário revogou o acesso lá no Google: volta o app
            // pro estado "desconectado" em vez de falhar pra sempre.
            if ($response->json('error') === 'invalid_grant') {
                $this->forget($user);

                throw new CalendarNotConnectedException;
            }

            throw new RuntimeException('Falha ao renovar token do Google Calendar: '.$response->body());
        }

        return $response->json('access_token');
    }

    private function forget(User $user): void
    {
        Cache::forget("gcal-token:{$user->id}");
        $user->forceFill([
            'google_calendar_refresh_token' => null,
            'google_calendar_connected_at' => null,
        ])->save();
    }
}
