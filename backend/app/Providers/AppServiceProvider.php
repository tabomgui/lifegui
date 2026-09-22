<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tela de consentimento OAuth do servidor MCP (view do laravel/mcp).
        Passport::authorizationView(fn ($parameters) => view('mcp.authorize', $parameters));

        // Chaves num subdiretório próprio: em produção é um volume montado,
        // pra rebuild da imagem não invalidar os tokens OAuth já emitidos.
        Passport::loadKeysFrom(storage_path('oauth'));
    }
}
