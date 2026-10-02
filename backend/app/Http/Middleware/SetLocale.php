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
            : (Locale::negotiate($request->getLanguages()) ?? Locale::DEFAULT);

        App::setLocale(Locale::toLaravel($locale));

        return $next($request);
    }
}
