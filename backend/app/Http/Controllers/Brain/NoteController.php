<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Http\Requests\Brain\StoreNoteRequest;
use App\Http\Requests\Brain\UpdateNoteRequest;
use App\Models\NoteLink;
use App\Models\Task;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    /**
     * Nome do template (em Templates/) por categoria do plano original.
     * Categorias fora do mapa tentam Templates/{categoria}.md e caem no
     * template genérico embutido.
     */
    private const TEMPLATE_MAP = [
        'IA' => 'IA',
        'Receitas' => 'Receita',
        'Calistenia' => 'Exercicio',
        'Bateria' => 'Aula-Bateria',
        'Instagram' => 'Instagram',
    ];

    private const FALLBACK_TEMPLATE = <<<'MD'
---
tipo: nota
tags: []
fonte:
data_salvo: {{date}}
status: novo
resumo:
---

# {{title}}

## Minhas anotações


MD;

    public function __construct(private readonly VaultService $vault) {}

    /** Todas as tags do vault (frontmatter), únicas e ordenadas — autocomplete do editor de tags. */
    public function tags(): JsonResponse
    {
        $tags = [];
        foreach ($this->vault->categories() as $category) {
            foreach ($this->vault->listMarkdown($category) as $path) {
                $note = $this->vault->read($path);
                foreach ((array) ($note['frontmatter']['tags'] ?? []) as $tag) {
                    if (is_string($tag) && $tag !== '') {
                        $tags[$tag] = true;
                    }
                }
            }
        }
        $tags = array_keys($tags);
        sort($tags, SORT_FLAG_CASE | SORT_STRING);

        return response()->json(['data' => $tags]);
    }

    public function index(Request $request): JsonResponse
    {
        $category = $request->query('category');
        $status = $request->query('status');
        $q = $request->query('q');

        $dirs = $category !== null
            ? (in_array($category, $this->vault->categories(), true) ? [$category] : [])
            : $this->vault->categories();

        $notes = [];
        foreach ($dirs as $dir) {
            foreach ($this->vault->listMarkdown($dir) as $path) {
                $summary = $this->summary($path);

                if ($status !== null && $summary['status'] !== $status) {
                    continue;
                }
                if ($q !== null && $q !== '' && ! $this->matches($summary, $q)) {
                    continue;
                }

                $notes[] = $summary;
            }
        }

        return response()->json(['data' => $notes, 'initialized' => $this->vault->initialized()]);
    }

    public function show(string $path): JsonResponse
    {
        $note = $this->vault->read($path);
        abort_if($note === null, 404);

        return response()->json(['data' => $this->full($path, $note)]);
    }

    public function store(StoreNoteRequest $request): JsonResponse
    {
        $category = $request->validated('category');
        $title = $this->sanitizeTitle($request->validated('title'));

        abort_if($title === '', 422, __('messages.brain.invalid_title'));

        $path = "{$category}/{$title}.md";

        abort_if($this->vault->resolve($path) !== null, 409, __('messages.brain.note_exists'));

        $raw = strtr($this->template($category), [
            '{{title}}' => $title,
            '{{date}}' => now()->format('Y-m-d'),
        ]);

        $parsed = $this->vault->parse($raw);

        $frontmatter = array_merge($parsed['frontmatter'], array_filter([
            'fonte' => $request->validated('fonte'),
            'resumo' => $request->validated('resumo'),
            'tags' => $request->validated('tags'),
        ], fn ($v) => $v !== null));
        $frontmatter['status'] = 'novo';
        $frontmatter['data_salvo'] = now()->format('Y-m-d');

        $body = $request->validated('body') ?? $parsed['body'];

        abort_if($this->vault->write($path, $frontmatter, $body, mustExist: false) === null, 422, __('messages.brain.invalid_category'));

        return response()->json(['data' => $this->full($path, $this->vault->read($path))], 201);
    }

    public function update(UpdateNoteRequest $request, string $path): JsonResponse
    {
        $note = $this->vault->read($path);
        abort_if($note === null, 404);

        $frontmatter = array_merge($note['frontmatter'], $request->validated('frontmatter') ?? []);
        $body = $request->validated('body') ?? $note['body'];

        $this->vault->write($path, $frontmatter, $body);

        return response()->json(['data' => $this->full($path, $this->vault->read($path))]);
    }

    public function destroy(string $path): JsonResponse
    {
        // Inbox tem descarte próprio (InboxController@destroy); aqui só notas
        // de categoria. Nunca apaga: move pra .trash (lixeira do Obsidian).
        abort_if(str_starts_with($path, '00-Inbox/') || str_starts_with($path, '.trash/'), 404);

        $absolute = $this->vault->resolve($path);
        abort_if($absolute === null, 404);

        $trash = $this->vault->root().'/.trash';
        if (! is_dir($trash)) {
            mkdir($trash, 0755, true);
        }

        $target = '.trash/'.now()->format('Y-m-d').'-'.basename($path);
        $absoluteTarget = $this->vault->resolve($target, mustExist: false);
        abort_if($absoluteTarget === null, 422, __('messages.brain.trash_missing'));
        rename($absolute, $absoluteTarget);

        // Vínculos com tarefas/hábitos apontam pro path antigo: limpa.
        \App\Models\NoteLink::where('note_path', $path)->delete();

        return response()->json(['data' => ['path' => $target]]);
    }

    /**
     * @return array{path: string, title: string, status: mixed, tags: array, fonte: mixed, resumo: mixed, data_salvo: mixed}
     */
    private function summary(string $path): array
    {
        $note = $this->vault->read($path) ?? ['frontmatter' => [], 'body' => ''];
        $fm = $note['frontmatter'];

        return [
            'path' => $path,
            'title' => basename($path, '.md'),
            'status' => $fm['status'] ?? null,
            'tags' => is_array($fm['tags'] ?? null) ? array_values($fm['tags']) : [],
            'fonte' => $fm['fonte'] ?? null,
            'resumo' => $fm['resumo'] ?? null,
            'data_salvo' => isset($fm['data_salvo']) && $fm['data_salvo'] !== null ? (string) $fm['data_salvo'] : null,
        ];
    }

    private function full(string $path, array $note): array
    {
        $links = NoteLink::query()
            ->where('note_path', $path)
            ->with('linkable')
            ->get()
            ->map(fn ($link) => [
                'id' => $link->id,
                'type' => $link->linkable_type === Task::class ? 'task' : 'habit',
                'linkable_id' => $link->linkable_id,
                'name' => $link->linkable?->title ?? $link->linkable?->name,
            ])
            ->values()
            ->all();

        return $this->summary($path) + [
            'frontmatter' => $note['frontmatter'],
            'body' => $note['body'],
            'links' => $links,
            'backlinks' => $this->backlinks($path),
        ];
    }

    /**
     * Notas cujo corpo tem um [[wikilink]] apontando pra esta (por título,
     * sem diferenciar maiúsculas). Varredura direta: escala pessoal.
     *
     * @return array<int, array{path: string, title: string, category: string}>
     */
    private function backlinks(string $path): array
    {
        $title = mb_strtolower(basename($path, '.md'));
        $result = [];

        foreach ($this->vault->categories() as $category) {
            foreach ($this->vault->listMarkdown($category) as $otherPath) {
                if ($otherPath === $path) {
                    continue;
                }
                $body = $this->vault->read($otherPath)['body'] ?? '';
                foreach ($this->vault->extractWikilinks($body) as $target) {
                    if (mb_strtolower($target) === $title) {
                        $result[] = [
                            'path' => $otherPath,
                            'title' => basename($otherPath, '.md'),
                            'category' => $category,
                        ];
                        break;
                    }
                }
            }
        }

        return $result;
    }

    private function matches(array $summary, string $q): bool
    {
        $haystack = mb_strtolower(implode(' ', array_filter([
            $summary['title'],
            $summary['resumo'],
            implode(' ', $summary['tags']),
        ], fn ($v) => is_string($v) && $v !== '')));

        return str_contains($haystack, mb_strtolower($q));
    }

    private function sanitizeTitle(string $title): string
    {
        $clean = str_replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|', '#', '[', ']'], '', $title);

        return trim(preg_replace('/\s+/', ' ', $clean) ?? '');
    }

    private function template(string $category): string
    {
        $candidates = array_unique([self::TEMPLATE_MAP[$category] ?? $category, $category]);

        foreach ($candidates as $name) {
            $content = $this->vault->read("Templates/{$name}.md");
            if ($content !== null) {
                // read() já separou; precisamos do raw pra manter {{vars}} no YAML.
                $absolute = $this->vault->resolve("Templates/{$name}.md");

                return (string) file_get_contents($absolute);
            }
        }

        return self::FALLBACK_TEMPLATE;
    }
}
