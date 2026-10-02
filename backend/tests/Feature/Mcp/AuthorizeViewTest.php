<?php

use App\Support\Locale;

// View de consentimento OAuth do MCP: client->name vem do catálogo de clients
// Passport (não é input do usuário autenticado, mas ainda assim não é
// confiável) — precisa estar escapado no HTML, e o heading/título seguem o
// idioma ativo.
function renderAuthorizeView(): string
{
    return view('mcp.authorize', [
        'client' => (object) ['id' => 'client-1', 'name' => '<script>alert(1)</script>'],
        'user' => (object) ['name' => 'Gui', 'email' => 'gui@example.com'],
        'authToken' => 'token-123',
    ])->render();
}

test('consentimento em inglês escapa o nome do client e traduz o título', function () {
    app()->setLocale(Locale::toLaravel('en'));

    $html = renderAuthorizeView();

    expect($html)->toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        ->not->toContain('<script>alert(1)</script>')
        ->toContain('Authorize access');
});

test('consentimento em pt-BR escapa o nome do client e traduz o título', function () {
    app()->setLocale(Locale::toLaravel('pt-BR'));

    $html = renderAuthorizeView();

    expect($html)->toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
        ->not->toContain('<script>alert(1)</script>')
        ->toContain('Autorizar acesso');
});
