<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

/**
 * Grafo de notas no estilo do Obsidian: cada nota é um nó, cada [[wikilink]]
 * uma aresta. Links pra títulos que não existem viram nós "fantasma"
 * (como o Obsidian mostra, apagadinhos).
 */
class GraphController extends Controller
{
    public function __construct(private readonly VaultService $vault) {}

    public function index(): JsonResponse
    {
        if (! $this->vault->initialized()) {
            return response()->json(['data' => ['nodes' => [], 'links' => []], 'initialized' => false]);
        }

        $meta = $this->vault->readCategoryMeta();

        // Passo 1: carrega todas as notas e indexa por título (minúsculo).
        $notes = [];
        $byTitle = [];
        foreach ($this->vault->categories() as $category) {
            foreach ($this->vault->listMarkdown($category) as $path) {
                $title = basename($path, '.md');
                $note = $this->vault->read($path) ?? ['frontmatter' => [], 'body' => ''];
                $tags = $note['frontmatter']['tags'] ?? [];
                $notes[$path] = [
                    'category' => $category,
                    'title' => $title,
                    'body' => $note['body'],
                    'tags' => is_array($tags) ? array_values(array_filter($tags, 'is_string')) : [],
                ];
                $byTitle[mb_strtolower($title)] = $path;
            }
        }

        // Passo 2: extrai wikilinks e resolve por título ([[Alvo]], [[Alvo|rótulo]],
        // [[Alvo#âncora]]); alvo inexistente vira nó fantasma.
        $links = [];
        $degree = array_fill_keys(array_keys($notes), 0);
        $ghosts = [];

        foreach ($notes as $path => $note) {
            foreach ($this->vault->extractWikilinks($note['body']) as $target) {
                $resolved = $byTitle[mb_strtolower($target)] ?? null;

                if ($resolved !== null) {
                    if ($resolved === $path) {
                        continue; // auto-link não vira aresta
                    }
                    $links[] = ['source' => $path, 'target' => $resolved];
                    $degree[$path]++;
                    $degree[$resolved]++;
                } else {
                    $ghostId = 'ghost:'.mb_strtolower($target);
                    $ghosts[$ghostId] ??= ['title' => $target, 'degree' => 0];
                    $ghosts[$ghostId]['degree']++;
                    $links[] = ['source' => $path, 'target' => $ghostId];
                    $degree[$path]++;
                }
            }
        }

        // Tags do frontmatter como nós opcionais (o front decide exibir):
        // ligam notas que compartilham assunto mesmo sem wikilink direto.
        $tagNodes = [];
        $tagLinks = [];
        foreach ($notes as $path => $note) {
            foreach ($note['tags'] as $tag) {
                $tagId = 'tag:'.mb_strtolower($tag);
                $tagNodes[$tagId] ??= ['title' => '#'.$tag, 'degree' => 0];
                $tagNodes[$tagId]['degree']++;
                $tagLinks[] = ['source' => $path, 'target' => $tagId, 'tag' => true];
            }
        }

        $nodes = [];
        foreach ($notes as $path => $note) {
            $nodes[] = [
                'id' => $path,
                'title' => $note['title'],
                'category' => $note['category'],
                'color' => $meta['meta'][$note['category']]['color'] ?? '#64748b',
                'degree' => $degree[$path],
            ];
        }
        foreach ($tagNodes as $id => $tagNode) {
            $nodes[] = [
                'id' => $id,
                'title' => $tagNode['title'],
                'category' => null,
                'color' => null,
                'degree' => $tagNode['degree'],
                'tag' => true,
            ];
        }
        $links = [...$links, ...$tagLinks];
        foreach ($ghosts as $id => $ghost) {
            $nodes[] = [
                'id' => $id,
                'title' => $ghost['title'],
                'category' => null,
                'color' => null,
                'degree' => $ghost['degree'],
                'ghost' => true,
            ];
        }

        return response()->json(['data' => ['nodes' => $nodes, 'links' => $links], 'initialized' => true]);
    }
}
