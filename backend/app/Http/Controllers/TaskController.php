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
            ->orderBy('position')->orderBy('id')
            ->get();

        return TaskResource::collection($tasks)->response();
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
        // Continue from the end of the 'todo' column instead of restarting
        // at 0, so successive process()/store() calls don't collide.
        $created = DB::transaction(function () use ($request) {
            $base = (int) Task::where('status', 'todo')->max('position') + 1;

            return collect($request->lines())->map(fn ($title, $i) => Task::create([
                'title' => $title,
                'status' => 'todo',
                'position' => $base + $i,
            ]));
        });

        return TaskResource::collection($created)->response()->setStatusCode(201);
    }
}
