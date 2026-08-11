<?php
namespace App\Http\Controllers;

use App\Http\Requests\Subtask\StoreSubtaskRequest;
use App\Http\Requests\Subtask\UpdateSubtaskRequest;
use App\Http\Resources\SubtaskResource;
use App\Models\Subtask;
use App\Models\Task;
use Illuminate\Http\JsonResponse;

class SubtaskController extends Controller
{
    public function store(StoreSubtaskRequest $request, Task $task): JsonResponse
    {
        $subtask = $task->subtasks()->create([
            'title' => $request->validated('title'),
            'done' => false,
            'position' => (int) $task->subtasks()->max('position') + 1,
        ]);

        return (new SubtaskResource($subtask))->response()->setStatusCode(201);
    }

    public function update(UpdateSubtaskRequest $request, Task $task, Subtask $subtask): JsonResponse
    {
        $subtask->update($request->validated());
        return (new SubtaskResource($subtask))->response();
    }

    public function destroy(Task $task, Subtask $subtask): JsonResponse
    {
        $subtask->delete();
        return response()->json(null, 204);
    }
}
