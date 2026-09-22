<?php

use App\Http\Controllers\Auth\GoogleCalendarController;
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

// OAuth incremental do Google Calendar: exige usuário já logado (a sessão web
// é a mesma do Sanctum stateful) e só adiciona o escopo de agenda.
Route::get('/api/auth/google-calendar/redirect', [GoogleCalendarController::class, 'redirect']);
Route::get('/api/auth/google-calendar/callback', [GoogleCalendarController::class, 'callback']);

// Deslogado no /oauth/authorize do MCP, o middleware manda pra route('login').
// A tela real é a do SPA (mesmo domínio); depois de logar, refaça a conexão
// no cliente MCP — a sessão web já estará de pé.
Route::redirect('/login', config('app.frontend_url').'/login')->name('login');
