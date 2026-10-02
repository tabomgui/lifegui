<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Http\Requests\Brain\StoreInboxRequest;
use App\Http\Requests\Brain\StoreNoteRequest;
use App\Support\Locale;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

class InboxController extends Controller
{
    private const INBOX = '00-Inbox';

    public function __construct(private readonly VaultService $vault) {}

    public function index(): JsonResponse
    {
        $items = array_map(function (string $path) {
            $note = $this->vault->read($path) ?? ['frontmatter' => [], 'body' => ''];
            $absolute = $this->vault->resolve($path);

            return [
                'path' => $path,
                'title' => basename($path, '.md'),
                'captured_at' => $absolute !== null ? date('Y-m-d H:i:s', filemtime($absolute)) : null,
                'preview' => mb_substr($note['body'], 0, 200),
            ];
        }, $this->vault->listMarkdown(self::INBOX));

        return response()->json(['data' => $items, 'initialized' => $this->vault->initialized()]);
    }

    public function store(StoreInboxRequest $request, \App\Support\Vault\InboxCaptureService $capture): JsonResponse
    {
        // Lógica compartilhada com a tool MCP `capturar`.
        $created = $capture->capture($request->validated('content'), $request->validated('title'));

        abort_if($created === null, 422, __('messages.brain.inbox_missing'));

        return response()->json(['data' => $created], 201);
    }

    public function promote(StoreNoteRequest $request, NoteController $notes, string $path): JsonResponse
    {
        abort_unless(str_starts_with($path, self::INBOX.'/') && ! str_contains($path, '/processados/'), 404);

        $capture = $this->vault->read($path);
        abort_if($capture === null, 404);

        // Cria a nota na categoria (template aplicado) com o conteúdo capturado
        // anexado em "Minhas anotações"/"My notes" (ou ao final do corpo).
        $response = $notes->store($request);
        $created = $response->getData(true)['data'];

        $note = $this->vault->read($created['path']);
        $body = $this->appendToAnnotations($note['body'], trim($capture['body']));
        $this->vault->write($created['path'], $note['frontmatter'], $body);

        // Nunca apaga: move o original pra processados com a data no nome.
        $target = self::INBOX.'/processados/'.now()->format('Y-m-d').'-'.basename($path);
        $absoluteTarget = $this->vault->resolve($target, mustExist: false);
        abort_if($absoluteTarget === null, 422, __('messages.brain.processed_missing'));
        rename((string) $this->vault->resolve($path), $absoluteTarget);

        return response()->json(['data' => array_merge($created, ['body' => $body])], 201);
    }

    public function destroy(string $path): JsonResponse
    {
        abort_unless(
            str_starts_with($path, self::INBOX.'/')
                && ! str_contains($path, '/processados/')
                && ! str_contains($path, '/descartados/'),
            404
        );

        $absolute = $this->vault->resolve($path);
        abort_if($absolute === null, 404);

        // Nunca apaga: move pra descartados com a data no nome (par do
        // promote/processados). A pasta é criada sob demanda.
        $dir = $this->vault->root().'/'.self::INBOX.'/descartados';
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $target = self::INBOX.'/descartados/'.now()->format('Y-m-d').'-'.basename($path);
        $absoluteTarget = $this->vault->resolve($target, mustExist: false);
        abort_if($absoluteTarget === null, 422, __('messages.brain.discarded_missing'));
        rename($absolute, $absoluteTarget);

        return response()->json(['data' => ['path' => $target]]);
    }

    private function appendToAnnotations(string $body, string $content): string
    {
        if ($content === '') {
            return $body;
        }

        // Aceita o heading em qualquer idioma suportado: notas antigas e
        // templates do usuário podem ter qualquer um. Sem o flag /u: o
        // heading é comparado byte a byte, e corpo com UTF-8 inválido não
        // deve derrubar o preg_match (o /u falha em string malformada).
        $headings = array_unique(array_map(
            fn (string $locale) => trans('notes.annotations_heading', [], Locale::toLaravel($locale)),
            Locale::SUPPORTED,
        ));
        $pattern = '/^## (?:'.implode('|', array_map(fn ($h) => preg_quote($h, '/'), $headings)).')\s*$/m';

        if (preg_match($pattern, $body, $m, PREG_OFFSET_CAPTURE) === 1) {
            $offset = $m[0][1] + strlen($m[0][0]);

            return substr($body, 0, $offset)."\n\n".$content."\n".substr($body, $offset);
        }

        return rtrim($body)."\n\n".$content."\n";
    }
}
