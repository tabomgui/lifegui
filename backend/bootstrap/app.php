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

        $middleware->statefulApi();

        // Corpo markdown das notas do vault vai byte a byte pro arquivo;
        // trim aqui corromperia whitespace significativo (fences, quebras finais).
        $middleware->trimStrings(except: ['body', 'content']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
