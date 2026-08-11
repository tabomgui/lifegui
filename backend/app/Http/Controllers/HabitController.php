<?php
namespace App\Http\Controllers;

use App\Http\Requests\Habit\StoreHabitRequest;
use App\Http\Requests\Habit\UpdateHabitRequest;
use App\Http\Resources\HabitResource;
use App\Models\Habit;
use Illuminate\Http\JsonResponse;

class HabitController extends Controller
{
    public function index(): JsonResponse
    {
        $habits = Habit::whereNull('archived_at')->orderBy('id')->get();
        return HabitResource::collection($habits)->response();
    }

    public function store(StoreHabitRequest $request): JsonResponse
    {
        $habit = Habit::create($request->validated());
        return (new HabitResource($habit))->response()->setStatusCode(201);
    }

    public function update(UpdateHabitRequest $request, Habit $habit): JsonResponse
    {
        $habit->update($request->validated());
        return (new HabitResource($habit))->response();
    }

    public function destroy(Habit $habit): JsonResponse
    {
        $habit->delete();
        return response()->json(null, 204);
    }
}
