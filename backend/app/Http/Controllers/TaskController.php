<?php
namespace App\Http\Controllers;

use App\Http\Requests\Task\HeatmapRequest;
use App\Http\Requests\Task\ProcessTasksRequest;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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

    public function heatmap(HeatmapRequest $request): JsonResponse
    {
        // completed_at is stored in UTC, but the heatmap must bucket by the
        // CLIENT's calendar day, or a task completed at night lands in the
        // wrong cell for anyone west of UTC (e.g. America/Sao_Paulo, UTC-3).
        $tz = $request->string('tz');
        if (! in_array((string) $tz, timezone_identifiers_list(), true)) {
            $tz = 'UTC';
        }

        $fromInput = $request->validated('from');
        $toInput = $request->validated('to');

        if ($fromInput && $toInput) {
            // Explicit window from the client's period filter (local Y-m-d).
            $from = Carbon::createFromFormat('Y-m-d', $fromInput, (string) $tz)->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', $toInput, (string) $tz)->startOfDay();
        } else {
            $now = now()->setTimezone($tz);
            $to = $now->copy()->startOfDay();
            $from = $to->copy()->subDays(370);
        }

        // Pad the UTC query window by a day on each side so tasks near the
        // client-timezone window edges aren't excluded before conversion.
        $tasks = Task::whereNotNull('completed_at')
            ->where('completed_at', '>=', $from->copy()->subDay()->utc())
            ->where('completed_at', '<=', $to->copy()->endOfDay()->addDay()->utc())
            ->get();

        $counts = $tasks
            ->groupBy(fn ($t) => $t->completed_at->copy()->setTimezone($tz)->toDateString())
            ->map->count()
            ->filter(fn ($c, $d) => $d >= $from->toDateString() && $d <= $to->toDateString());

        return response()->json(['data' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            // Cast to stdClass so an empty result serializes as `{}` not `[]` —
            // PHP can't distinguish an empty assoc array from an empty list,
            // and the frontend expects a Record<string, number> object shape.
            'counts' => (object) $counts->all(),
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
