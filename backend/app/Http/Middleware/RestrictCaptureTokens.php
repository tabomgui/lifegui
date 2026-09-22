<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tokens de API deste app existem só pra captura (Atalho do iPhone → inbox).
 * Se a autenticação veio de um personal access token, a request só passa se
 * for exatamente o POST de captura e o token tiver a ability brain:capture.
 * Sessões SPA (TransientToken) não são afetadas.
 */
class RestrictCaptureTokens
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->user()?->currentAccessToken();

        if ($token instanceof PersonalAccessToken) {
            $isCapture = $request->isMethod('POST') && $request->is('api/brain/inbox');

            abort_unless($isCapture && $token->can('brain:capture'), 403, 'Este token só permite capturar no inbox.');
        }

        return $next($request);
    }
}
