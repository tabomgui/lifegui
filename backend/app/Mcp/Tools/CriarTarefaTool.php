<?php

namespace App\Mcp\Tools;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('criar_tarefa')]
#[Description('Cria uma tarefa no lifegui, com prazo, categoria (pelo nome) e prioridade opcionais.')]
class CriarTarefaTool extends Tool
{
    public function handle(Request $request): Response
    {
        $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'prazo' => ['nullable', 'date_format:Y-m-d'],
            'categoria' => ['nullable', 'string'],
            'prioridade' => ['nullable', 'boolean'],
        ]);

        $categoryId = null;
        if ($request->get('categoria')) {
            $category = Category::whereRaw('LOWER(name) = ?', [mb_strtolower($request->get('categoria'))])->first();
            if ($category === null) {
                $nomes = Category::pluck('name')->implode(', ');

                return Response::error("Categoria \"{$request->get('categoria')}\" não existe. Disponíveis: {$nomes}.");
            }
            $categoryId = $category->id;
        }

        $task = Task::create([
            'title' => $request->get('titulo'),
            'status' => 'todo',
            'due_date' => $request->get('prazo'),
            'category_id' => $categoryId,
            'is_priority' => (bool) $request->get('prioridade'),
            'position' => (Task::where('status', 'todo')->max('position') ?? 0) + 1,
        ]);

        $extras = array_filter([
            $task->due_date?->format('d/m/Y'),
            $categoryId ? $request->get('categoria') : null,
            $task->is_priority ? 'prioridade' : null,
        ]);

        return Response::text("Tarefa criada: \"{$task->title}\""
            .($extras !== [] ? ' ('.implode(', ', $extras).')' : '').'.');
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'titulo' => $schema->string()->description('Título da tarefa.')->required(),
            'prazo' => $schema->string()->description('Prazo Y-m-d, opcional.'),
            'categoria' => $schema->string()->description('Nome de uma categoria existente do usuário, opcional.'),
            'prioridade' => $schema->boolean()->description('Marcar como prioridade.'),
        ];
    }
}
