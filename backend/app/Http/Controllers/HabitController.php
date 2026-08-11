<?php
namespace App\Http\Controllers;

use App\Http\Requests\Habit\StoreHabitRequest;
use App\Http\Requests\Habit\SummaryRequest;
use App\Http\Requests\Habit\ToggleHabitRequest;
use App\Http\Requests\Habit\UpdateHabitRequest;
use App\Http\Resources\HabitResource;
use App\Models\Habit;
use App\Support\HabitSummary;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

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

    public function toggle(ToggleHabitRequest $request, Habit $habit): JsonResponse
    {
        $date = $request->validated('date');

        $log = DB::transaction(function () use ($habit, $date) {
            $log = $habit->logs()->where('date', $date)->lockForUpdate()->first();
            if ($log) {
                $log->done = ! $log->done;
                $log->save();
                return $log;
            }

            try {
                return $habit->logs()->create(['date' => $date, 'done' => true]);
            } catch (UniqueConstraintViolationException $e) {
                // Concorrência: outro request criou o log entre o SELECT e o INSERT.
                // Relê com lock e inverte o valor já persistido.
                $log = $habit->logs()->where('date', $date)->lockForUpdate()->first();
                $log->done = ! $log->done;
                $log->save();
                return $log;
            }
        });

        return response()->json([
            'data' => [
                'date' => $log->date->toDateString(),
                'done' => $log->done,
            ],
        ]);
    }

    public function summary(SummaryRequest $request): JsonResponse
    {
        $weekStart = Carbon::parse($request->validated('week'));
        $weekEnd = $weekStart->copy()->addDays(6);

        $habits = Habit::whereNull('archived_at')->orderBy('id')->get();

        $data = $habits->map(function (Habit $habit) use ($weekStart, $weekEnd) {
            $doneByDate = $habit->logs()
                ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->get()
                ->mapWithKeys(fn ($log) => [$log->date->toDateString() => $log->done]);

            return HabitSummary::forHabit($habit, $weekStart, $doneByDate);
        });

        return response()->json(['data' => $data]);
    }
}
