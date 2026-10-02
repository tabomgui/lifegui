<?php

use App\Models\User;
use Illuminate\Testing\TestResponse;
use Laravel\Passport\Passport;

// Teste de ponta a ponta (rota HTTP /mcp real, com o middleware SetLocale
// rodando de verdade) pras instruções do servidor virem no idioma do usuário
// — complementa o teste unitário em ToolsLocaleTest que chama createContext()
// direto.
function initializeMcp(): TestResponse
{
    return test()->postJson('/mcp', [
        'jsonrpc' => '2.0',
        'id' => 1,
        'method' => 'initialize',
        'params' => [
            'protocolVersion' => '2025-06-18',
            'capabilities' => [],
            'clientInfo' => ['name' => 'test-client', 'version' => '1.0'],
        ],
    ]);
}

test('instruções do /mcp vêm em inglês pro usuário com locale en', function () {
    $user = User::factory()->create(['locale' => 'en']);
    Passport::actingAs($user, ['mcp:use']);

    initializeMcp()
        ->assertOk()
        ->assertJsonPath('result.instructions', fn ($value) => str_contains($value, 'Answer in English'));
});

test('instruções do /mcp vêm em português pro usuário com locale pt-BR', function () {
    $user = User::factory()->create(['locale' => 'pt-BR']);
    Passport::actingAs($user, ['mcp:use']);

    initializeMcp()
        ->assertOk()
        ->assertJsonPath('result.instructions', fn ($value) => str_contains($value, 'Responda em português'));
});
