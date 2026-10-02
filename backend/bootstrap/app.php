<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Atrás do Cloudflare Tunnel: confia nos headers X-Forwarded-* pra reconhecer
        // o esquema (https) e host originais — necessário pros cookies Secure do Sanctum.
        $middleware->trustProxies(at: '*', headers: Request::HEADER_X_FORWARDED_FOR
            | Request::HEADER_X_FORWARDED_HOST
            | Request::HEADER_X_FORWARDED_PORT
            | Request::HEADER_X_FORWARDED_PROTO);

        // Host/X-Forwarded-Host vêm do cliente: só aceita o host do APP_URL (e subdomínios),
        // senão URLs absolutas (discovery OAuth, redirects) poderiam apontar pra host forjado.
        // localhost/127.0.0.1 também passam: health check do compose e do instalador chegam
        // com esse Host, e nenhum dos dois aponta pra domínio de terceiros.
        // O Laravel desliga a checagem em ambiente local e nos testes.
        $middleware->trustHosts(at: ['^localhost$', '^127\.0\.0\.1$']);

        $middleware->statefulApi();

        // Corpo markdown das notas do vault vai byte a byte pro arquivo;
        // trim aqui corromperia whitespace significativo (fences, quebras finais).
        $middleware->trimStrings(except: ['body', 'content']);

        // Idioma por request (usuário logado > Accept-Language > en). Precisa rodar
        // depois do auth pra enxergar o usuário do guard certo (sanctum/api).
        $middleware->appendToGroup('web', \App\Http\Middleware\SetLocale::class);
        $middleware->appendToGroup('api', \App\Http\Middleware\SetLocale::class);
        $middleware->appendToPriorityList(
            \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            \App\Http\Middleware\SetLocale::class,
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
