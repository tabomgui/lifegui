<?php

use App\Http\Middleware\SetLocale;
use App\Mcp\Servers\LifeguiServer;
use Laravel\Mcp\Facades\Mcp;

// Discovery OAuth (/.well-known/*) + registro dinâmico de clientes (DCR),
// exigidos por claude.ai e ChatGPT. Passport emite os tokens (guard api).
Mcp::oauthRoutes();

Mcp::web('/mcp', LifeguiServer::class)->middleware(['auth:api', SetLocale::class]);
