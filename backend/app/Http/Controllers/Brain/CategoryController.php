<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Models\NoteLink;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    private const DEFAULT_ICON = 'folder';

    private const DEFAULT_COLOR = '#64748b';

    public function __construct(private readonly VaultService $vault) {}

    /**
     * Zero touch: cria o vault do usuário (raiz + 00-Inbox/processados) por
     * dentro do sistema. Idempotente — chamar de novo não faz nada.
     */
    public function init(): JsonResponse
    {
        $inbox = $this->vault->root().'/00-Inbox/processados';
        if (! is_dir($inbox)) {
            mkdir($inbox, 0755, true);
        }

        return response()->json(['data' => ['initialized' => true]], 201);
    }

    public function index(): JsonResponse
    {
        if (! $this->vault->initialized()) {
            return response()->json(['data' => [], 'initialized' => false]);
        }

        $meta = $this->vault->readCategoryMeta();

        $data = array_map(function (string $name) use ($meta) {
            $counts = [];
            $total = 0;
            foreach ($this->vault->listMarkdown($name) as $path) {
                $note = $this->vault->read($path);
                $status = $note['frontmatter']['status'] ?? null;
                if (is_string($status) && $status !== '') {
                    $counts[$status] = ($counts[$status] ?? 0) + 1;
                }
                $total++;
            }

            return [
                'name' => $name,
                'icon' => $meta['meta'][$name]['icon'] ?? self::DEFAULT_ICON,
                'color' => $meta['meta'][$name]['color'] ?? self::DEFAULT_COLOR,
                'counts' => (object) $counts,
                'total' => $total,
            ];
        }, $this->ordered($meta['order']));

        return response()->json(['data' => $data, 'initialized' => true]);
    }

    public function store(Request $request): JsonResponse
    {
        $input = $this->validateCategory($request);
        $name = $input['name'];

        abort_if(is_dir($this->vault->root().'/'.$name), 409, 'Já existe uma categoria com esse nome.');
        abort_unless($this->vault->initialized(), 422, 'Vault não inicializado.');

        $meta = $this->vault->readCategoryMeta();
        // Congela a ordem atual antes do mkdir pra nova categoria entrar no fim.
        $currentOrder = $this->ordered($meta['order']);

        mkdir($this->vault->root().'/'.$name, 0755);

        $meta['order'] = [...$currentOrder, $name];
        $meta['meta'][$name] = $this->metaEntry($input);
        $this->vault->writeCategoryMeta($meta);

        return response()->json(['data' => [
            'name' => $name,
            'icon' => $meta['meta'][$name]['icon'],
            'color' => $meta['meta'][$name]['color'],
            'counts' => (object) [],
            'total' => 0,
        ]], 201);
    }

    public function update(Request $request, string $category): JsonResponse
    {
        abort_unless(in_array($category, $this->vault->categories(), true), 404);

        $input = $this->validateCategory($request, renameOf: $category);
        $name = $input['name'] ?? $category;

        if ($name !== $category) {
            abort_if(is_dir($this->vault->root().'/'.$name), 409, 'Já existe uma categoria com esse nome.');

            DB::transaction(function () use ($category, $name) {
                // Links apontam por caminho: renomear a pasta exige reescrever
                // o prefixo em todos os vínculos do usuário.
                NoteLink::query()
                    ->where('note_path', 'like', $category.'/%')
                    ->get()
                    ->each(fn (NoteLink $link) => $link->update([
                        'note_path' => $name.substr($link->note_path, strlen($category)),
                    ]));

                rename($this->vault->root().'/'.$category, $this->vault->root().'/'.$name);
            });
        }

        $meta = $this->vault->readCategoryMeta();
        $entry = $this->metaEntry($input, $meta['meta'][$category] ?? []);
        unset($meta['meta'][$category]);
        $meta['meta'][$name] = $entry;
        $meta['order'] = array_map(
            fn (string $n) => $n === $category ? $name : $n,
            $this->ordered($meta['order'], renamed: [$category => $name]),
        );
        $this->vault->writeCategoryMeta($meta);

        return response()->json(['data' => [
            'name' => $name,
            'icon' => $entry['icon'],
            'color' => $entry['color'],
        ]]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order' => ['required', 'array'],
            'order.*' => ['string'],
        ]);

        $existing = $this->vault->categories();
        $meta = $this->vault->readCategoryMeta();
        $meta['order'] = array_values(array_filter($validated['order'], fn ($n) => in_array($n, $existing, true)));
        $this->vault->writeCategoryMeta($meta);

        return response()->json(['data' => $meta['order']]);
    }

    public function destroy(string $category): JsonResponse
    {
        abort_unless(in_array($category, $this->vault->categories(), true), 404);

        $dir = $this->vault->root().'/'.$category;
        $entries = array_diff(scandir($dir) ?: [], ['.', '..']);
        // Nunca apagamos conteúdo do usuário: só pasta vazia sai.
        abort_if($entries !== [], 409, 'A categoria tem notas; mova ou conclua antes de apagar.');

        rmdir($dir);

        $meta = $this->vault->readCategoryMeta();
        unset($meta['meta'][$category]);
        $meta['order'] = array_values(array_filter($meta['order'], fn ($n) => $n !== $category));
        $this->vault->writeCategoryMeta($meta);

        return response()->json(null, 204);
    }

    /**
     * Ordem final: a salva nos metadados primeiro (só pastas existentes),
     * depois pastas novas em ordem alfabética.
     *
     * @param  array<int, string>  $saved
     * @param  array<string, string>  $renamed
     * @return array<int, string>
     */
    private function ordered(array $saved, array $renamed = []): array
    {
        $existing = $this->vault->categories();
        $saved = array_unique(array_map(fn (string $n) => $renamed[$n] ?? $n, $saved));
        $known = array_values(array_filter($saved, fn ($n) => in_array($n, $existing, true)));
        $rest = array_values(array_diff($existing, $known));

        return [...$known, ...$rest];
    }

    /**
     * @return array{name?: string, icon?: string, color?: string}
     */
    private function validateCategory(Request $request, ?string $renameOf = null): array
    {
        return $request->validate([
            'name' => [
                $renameOf === null ? 'required' : 'sometimes',
                'string',
                'max:60',
                'regex:/^[^\/\\\\.][^\/\\\\]*$/', // sem barras; não começa com ponto
                Rule::notIn(['00-Inbox', 'Templates', '..']),
            ],
            'icon' => ['nullable', 'string', 'max:40'],
            'color' => ['nullable', 'string', 'max:20'],
        ]);
    }

    /**
     * @return array{icon: string, color: string}
     */
    private function metaEntry(array $input, array $current = []): array
    {
        return [
            'icon' => $input['icon'] ?? $current['icon'] ?? self::DEFAULT_ICON,
            'color' => $input['color'] ?? $current['color'] ?? self::DEFAULT_COLOR,
        ];
    }
}
