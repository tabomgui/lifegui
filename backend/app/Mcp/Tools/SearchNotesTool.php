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

#[Name('search_notes')]
#[Description('Searches notes in the second brain (Obsidian vault) by text in the title or content, or reads an entire note by path. Use for "what did I write about X" or to retrieve the content of a note.')]
class SearchNotesTool extends Tool
{
    public function __construct(private VaultService $vault) {}

    public function handle(Request $request): Response
    {
        $busca = trim((string) $request->get('query'));
        $caminho = trim((string) $request->get('path'));

        if ($caminho !== '') {
            $note = $this->vault->read($caminho);
            if ($note === null) {
                return Response::error("Nota não encontrada: {$caminho}");
            }
            $fm = $note['frontmatter'] !== [] ? Yaml::dump($note['frontmatter'])."\n---\n" : '';

            return Response::text('# '.basename($caminho, '.md')."\n\n{$fm}{$note['body']}");
        }

        if ($busca === '') {
            return Response::error('Informe "query" (texto) ou "path" (nota específica).');
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
                ."\n\nUse search_notes com o path pra ler uma nota inteira.");
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'query' => $schema->string()->description('Text to search for in titles and content.'),
            'path' => $schema->string()->description('Relative path of the note (e.g. IA/RAG.md) to read in full.'),
        ];
    }
}
