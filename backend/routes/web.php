<?php

use App\Http\Controllers\Auth\GoogleController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// OAuth (Socialite) fica no grupo `web` porque precisa de sessão/cookies: o callback
// chega direto do Google, fora do fluxo stateful do Sanctum (que só cobre requests do
// SPA). O caminho /api/... é mantido pra casar com o link do frontend e o proxy do nginx.
Route::get('/api/auth/google/redirect', [GoogleController::class, 'redirect']);
Route::get('/api/auth/google/callback', [GoogleController::class, 'callback']);
