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
        $categoryName = null;
        if ($request->get('category')) {
            $category = Category::whereRaw('LOWER(name) = ?', [mb_strtolower($request->get('category'))])->first();
            if ($category === null) {
                $nomes = Category::pluck('name')->implode(', ');

                return Response::error(__('mcp.create_task.category_not_found', ['category' => $request->get('category'), 'available' => $nomes]));
            }
            $categoryId = $category->id;
            $categoryName = $category->name;
        }

        $task = Task::create([
            'title' => $request->get('title'),
            'status' => 'todo',
            'due_date' => $request->get('due'),
            'category_id' => $categoryId,
            'is_priority' => (bool) $request->get('priority'),
            'position' => (Task::where('status', 'todo')->max('position') ?? 0) + 1,
        ]);

        // Ecoa o nome canônico da categoria (como está salva), não o texto que o
        // usuário/modelo mandou (podem diferir em caixa/acentuação).
        $extras = array_filter([
            $task->due_date?->format(__('mcp.date_format')),
            $categoryName,
            $task->is_priority ? __('mcp.create_task.priority_tag') : null,
        ]);

        return Response::text($extras !== []
            ? __('mcp.create_task.created_with_extras', ['title' => $task->title, 'extras' => implode(', ', $extras)])
            : __('mcp.create_task.created', ['title' => $task->title]));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'title' => $schema->string()->description('Task title.')->required(),
            'due' => $schema->string()->description('Due date, YYYY-MM-DD (e.g. 2026-10-01), optional.'),
            'category' => $schema->string()->description("Name of one of the user's existing categories (optional, case-insensitive)."),
            'priority' => $schema->boolean()->description('Mark as priority.'),
        ];
    }
}
