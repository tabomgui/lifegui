<?php

namespace App\Http\Middleware;

use App\Support\Locale;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Idioma da request: o do usuário logado; sem login, o Accept-Language
 * (o SPA manda o idioma ativo); sem nada, o padrão (en).
 * Roda depois da autenticação (ver appendToPriorityList em bootstrap/app.php).
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $userLocale = $request->user()?->locale;

        $locale = Locale::isSupported($userLocale)
            ? $userLocale
            : (Locale::negotiate($request->getLanguages()) ?? $this->fallbackLocale());

        App::setLocale(Locale::toLaravel($locale));

        return $next($request);
    }

    /**
     * Sem usuário logado e sem Accept-Language reconhecido, cai no idioma da
     * instância (APP_LOCALE) em vez de sempre inglês.
     */
    private function fallbackLocale(): string
    {
        $configured = Locale::fromLaravel((string) config('app.locale'));

        return Locale::isSupported($configured) ? $configured : Locale::DEFAULT;
    }
}
