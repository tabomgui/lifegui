<?php

namespace App\Http\Controllers\Brain;

use App\Http\Controllers\Controller;
use App\Http\Requests\Brain\StoreLinkRequest;
use App\Models\Habit;
use App\Models\NoteLink;
use App\Models\Task;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

class LinkController extends Controller
{
    private const TYPES = ['task' => Task::class, 'habit' => Habit::class];

    public function store(StoreLinkRequest $request, VaultService $vault): JsonResponse
    {
        $class = self::TYPES[$request->validated('type')];

        // Global scope BelongsToUser garante que só um registro do próprio
        // usuário é encontrável; 404 pra id alheio ou inexistente.
        $linkable = $class::query()->findOrFail($request->validated('id'));

        $notePath = $request->validated('note_path');
        abort_if($vault->resolve($notePath) === null, 422, 'Nota não encontrada no vault.');

        // Idempotente: repetir o vínculo devolve o existente.
        $link = NoteLink::query()->firstOrCreate([
            'linkable_type' => $class,
            'linkable_id' => $linkable->id,
            'note_path' => $notePath,
        ]);

        return response()->json(['data' => [
            'id' => $link->id,
            'note_path' => $link->note_path,
            'exists' => true,
        ]], $link->wasRecentlyCreated ? 201 : 200);
    }

    public function destroy(NoteLink $link): JsonResponse
    {
        $link->delete();

        return response()->json(null, 204);
    }
}
