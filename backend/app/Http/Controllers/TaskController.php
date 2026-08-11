<?php
namespace App\Http\Controllers;

use App\Http\Requests\Task\ProcessTasksRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::query()
            ->when($request->filled('category_id'), fn ($q) => $q->where('category_id', $request->integer('category_id')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->orderBy('position')->orderBy('id')
            ->get();

        return TaskResource::collection($tasks)->response();
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        // Task::create() doesn't refresh in-memory attributes from the DB
        // column default, so 'status' must be defaulted explicitly here or
        // the returned resource would show status: null instead of 'todo'.
        $task = Task::create([
            ...$request->validated(),
            'status' => $request->validated('status') ?? 'todo',
        ]);
        return (new TaskResource($task))->response()->setStatusCode(201);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $task->update($request->validated());
        return (new TaskResource($task))->response();
    }

    public function destroy(Task $task): JsonResponse
    {
        $task->delete();
        return response()->json(null, 204);
    }

    public function process(ProcessTasksRequest $request): JsonResponse
    {
        $created = collect($request->lines())->map(fn ($title, $i) => Task::create([
            'title' => $title,
            'status' => 'todo',
            'position' => $i,
        ]));

        return TaskResource::collection($created)->response()->setStatusCode(201);
    }
}
