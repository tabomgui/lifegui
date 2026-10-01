<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\GoogleCredentials;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;

class GoogleController extends Controller
{
    public function redirect(): RedirectResponse
    {
        // Rede de segurança: o frontend já esconde o botão de login com Google
        // quando a instância não tem credenciais, mas um link direto cairia na
        // tela de erro "Missing required parameter: client_id" do próprio Google.
        if (! GoogleCredentials::configured()) {
            return redirect(config('app.frontend_url').'/login');
        }

        return Socialite::driver('google')->stateless()->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        $googleUser = Socialite::driver('google')->stateless()->user();

        // Cadastro fechado: Google só entra em conta que já existe.
        $exists = User::where('email', $googleUser->getEmail())->exists();
        if (! $exists && ! config('lifegui.registration_enabled')) {
            return redirect(config('app.frontend_url').'/login?error=registration_closed');
        }

        $user = User::updateOrCreate(
            ['email' => $googleUser->getEmail()],
            [
                'name' => $googleUser->getName(),
                'google_id' => $googleUser->getId(),
                'avatar' => $googleUser->getAvatar(),
            ]
        );

        Auth::login($user);

        $request->session()->regenerate();

        return redirect(config('app.frontend_url').'/dashboard');
    }
}
