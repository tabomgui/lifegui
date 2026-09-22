<?php

namespace App\Mcp\Tools;

use App\Support\Vault\VaultService;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;
use Symfony\Component\Yaml\Yaml;

#[Name('buscar_notas')]
#[Description('Busca notas no segundo cérebro (vault Obsidian) por texto no título ou no conteúdo, ou lê uma nota inteira pelo caminho. Use para "o que anotei sobre X" ou pra recuperar o conteúdo de uma nota.')]
class BuscarNotasTool extends Tool
{
    public function __construct(private VaultService $vault) {}

    public function handle(Request $request): Response
    {
        $busca = trim((string) $request->get('busca'));
        $caminho = trim((string) $request->get('caminho'));

        if ($caminho !== '') {
            $note = $this->vault->read($caminho);
            if ($note === null) {
                return Response::error("Nota não encontrada: {$caminho}");
            }
            $fm = $note['frontmatter'] !== [] ? Yaml::dump($note['frontmatter'])."\n---\n" : '';

            return Response::text('# '.basename($caminho, '.md')."\n\n{$fm}{$note['body']}");
        }

        if ($busca === '') {
            return Response::error('Informe "busca" (texto) ou "caminho" (nota específica).');
        }

        $hits = [];
        foreach ($this->vault->categories() as $categoria) {
            foreach ($this->vault->listMarkdown($categoria) as $path) {
                $titulo = basename($path, '.md');
                $note = $this->vault->read($path) ?? ['body' => ''];
                $pos = mb_stripos($titulo, $busca);
                $posBody = mb_stripos($note['body'], $busca);
                if ($pos === false && $posBody === false) {
                    continue;
                }
                $trecho = $posBody !== false
                    ? '…'.trim(mb_substr($note['body'], max(0, $posBody - 60), 160)).'…'
                    : mb_substr($note['body'], 0, 120);
                $hits[] = "- **{$titulo}** (`{$path}`): ".str_replace("\n", ' ', $trecho);
                if (count($hits) >= 10) {
                    break 2;
                }
            }
        }

        return $hits === []
            ? Response::text("Nenhuma nota encontrada pra \"{$busca}\".")
            : Response::text("Notas encontradas pra \"{$busca}\":\n\n".implode("\n", $hits)
                ."\n\nUse buscar_notas com o caminho pra ler uma nota inteira.");
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'busca' => $schema->string()->description('Texto pra procurar em títulos e conteúdo.'),
            'caminho' => $schema->string()->description('Caminho relativo da nota (ex.: IA/RAG.md) pra ler inteira.'),
        ];
    }
}
