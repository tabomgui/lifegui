<?php

namespace App\Mcp\Tools;

use App\Support\Vault\InboxCaptureService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('capturar')]
#[Description('Guarda um link ou texto no inbox do segundo cérebro pra processar depois. Mesmo fluxo do Atalho do iPhone. Use quando o usuário mandar "salva isso", "guarda esse link", "anota pra eu ver depois".')]
class CapturarTool extends Tool
{
    public function __construct(private InboxCaptureService $capture) {}

    public function handle(Request $request): Response
    {
        $request->validate([
            'conteudo' => ['required', 'string', 'max:20000'],
            'titulo' => ['nullable', 'string', 'max:150'],
        ]);

        $created = $this->capture->capture($request->get('conteudo'), $request->get('titulo'));

        if ($created === null) {
            return Response::error('Inbox não encontrado no vault do usuário.');
        }

        return Response::text("Capturado no inbox: {$created['title']} ({$created['path']}).");
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'conteudo' => $schema->string()->description('Link ou texto a guardar.')->required(),
            'titulo' => $schema->string()->description('Título opcional da captura.'),
        ];
    }
}
