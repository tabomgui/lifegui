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

#[Name('create_task')]
#[Description('Creates a task in lifegui, with optional due date, category (by name) and priority.')]
class CreateTaskTool extends Tool
{
    public function handle(Request $request): Response
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'due' => ['nullable', 'date_format:Y-m-d'],
            'category' => ['nullable', 'string'],
            'priority' => ['nullable', 'boolean'],
        ]);

        $categoryId = null;
        if ($request->get('category')) {
            $category = Category::whereRaw('LOWER(name) = ?', [mb_strtolower($request->get('category'))])->first();
            if ($category === null) {
                $nomes = Category::pluck('name')->implode(', ');

                return Response::error("Categoria \"{$request->get('category')}\" não existe. Disponíveis: {$nomes}.");
            }
            $categoryId = $category->id;
        }

        $task = Task::create([
            'title' => $request->get('title'),
            'status' => 'todo',
            'due_date' => $request->get('due'),
            'category_id' => $categoryId,
            'is_priority' => (bool) $request->get('priority'),
            'position' => (Task::where('status', 'todo')->max('position') ?? 0) + 1,
        ]);

        $extras = array_filter([
            $task->due_date?->format('d/m/Y'),
            $categoryId ? $request->get('category') : null,
            $task->is_priority ? 'prioridade' : null,
        ]);

        return Response::text("Tarefa criada: \"{$task->title}\""
            .($extras !== [] ? ' ('.implode(', ', $extras).')' : '').'.');
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->description('Task title.')->required(),
            'due' => $schema->string()->description('Due date Y-m-d, optional.'),
            'category' => $schema->string()->description("Name of an existing category of the user's, optional."),
            'priority' => $schema->boolean()->description('Mark as priority.'),
        ];
    }
}
