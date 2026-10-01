<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Support\GoogleCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * OAuth incremental do Google Calendar: escopo adicional pedido por cima do
 * login existente. access_type=offline + prompt=consent forçam o Google a
 * devolver um refresh token, que fica criptografado na users.
 */
class GoogleCalendarController extends Controller
{
    private const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

    public function redirect(): RedirectResponse
    {
        if (! Auth::check()) {
            return redirect(config('app.frontend_url').'/login');
        }

        // Rede de segurança: o frontend já esconde o botão de conectar quando a
        // instância não tem credenciais, mas um link direto cairia na tela de
        // erro "Missing required parameter: client_id" do próprio Google.
        if (! GoogleCredentials::configured()) {
            return redirect(config('app.frontend_url').'/configuracoes?calendar=error');
        }

        return Socialite::driver('google')
            ->stateless()
            ->redirectUrl(config('services.google.calendar_redirect'))
            ->scopes([self::SCOPE])
            ->with(['access_type' => 'offline', 'prompt' => 'consent'])
            ->redirect();
    }

    public function callback(): RedirectResponse
    {
        $settings = config('app.frontend_url').'/configuracoes';

        $user = Auth::user();
        if (! $user) {
            return redirect(config('app.frontend_url').'/login');
        }

        try {
            $googleUser = Socialite::driver('google')
                ->stateless()
                ->redirectUrl(config('services.google.calendar_redirect'))
                ->user();
        } catch (Throwable) {
            return redirect($settings.'?calendar=error');
        }

        // A conta autorizada precisa ser a mesma do login — senão a agenda de
        // outra conta Google apareceria dentro deste usuário do lifegui.
        if (strcasecmp($googleUser->getEmail(), $user->email) !== 0) {
            return redirect($settings.'?calendar=mismatch');
        }

        if (! $googleUser->refreshToken) {
            return redirect($settings.'?calendar=error');
        }

        $user->forceFill([
            'google_calendar_refresh_token' => $googleUser->refreshToken,
            'google_calendar_connected_at' => now(),
        ])->save();

        return redirect($settings.'?calendar=connected');
    }
}
