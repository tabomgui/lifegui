<?php
namespace App\Http\Controllers;

use App\Http\Requests\Task\ProcessTasksRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::query()
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->withCount(['subtasks', 'subtasks as subtasks_done_count' => fn ($q) => $q->where('done', true)])
            ->with('subtasks') // inclui as subtarefas para a prévia no card
            ->orderBy('position')->orderBy('id')
            ->get();

        return TaskResource::collection($tasks)->response();
    }

    public function show(Task $task): JsonResponse
    {
        return (new TaskResource($task->load('subtasks')))->response();
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        // Task::create() doesn't refresh in-memory attributes from the DB
        // column default, so 'status' must be defaulted explicitly here or
        // the returned resource would show status: null instead of 'todo'.
        $status = $request->validated('status') ?? 'todo';

        // Position lands at the end of the target column so newly created
        // tasks don't collide with (or overwrite) existing ones at 0.
        $task = Task::create([
            ...$request->validated(),
            'status' => $status,
            'position' => (int) Task::where('status', $status)->max('position') + 1,
            'completed_at' => $status === 'done' ? now() : null,
        ]);
        return (new TaskResource($task))->response()->setStatusCode(201);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('status', $data) && $data['status'] !== $task->status) {
            $data['completed_at'] = $data['status'] === 'done' ? now() : null;
        }

        $task->update($data);
        return (new TaskResource($task))->response();
    }

    public function heatmap(): JsonResponse
    {
        $to = now()->startOfDay();
        $from = $to->copy()->subDays(370);

        $counts = Task::whereNotNull('completed_at')
            ->whereBetween('completed_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->get()
            ->groupBy(fn ($t) => $t->completed_at->toDateString())
            ->map->count();

        return response()->json(['data' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'counts' => $counts,
            'total' => $counts->sum(),
        ]]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return response()->json(null, 204);
    }

    public function process(ProcessTasksRequest $request): JsonResponse
    {
        // Continue from the end of the 'todo' column instead of restarting
        // at 0, so successive process()/store() calls don't collide.
        $categoryId = $request->validated('category_id') ?? null;

        $created = DB::transaction(function () use ($request, $categoryId) {
            $base = (int) Task::where('status', 'todo')->max('position') + 1;

            return collect($request->lines())->map(fn ($title, $i) => Task::create([
                'title' => $title,
                'status' => 'todo',
                'position' => $base + $i,
                'category_id' => $categoryId,
            ]));
        });

        return TaskResource::collection($created)->response()->setStatusCode(201);
    }
}
