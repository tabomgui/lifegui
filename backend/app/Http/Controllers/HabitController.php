<?php

namespace App\Http\Controllers;

use App\Http\Requests\Habit\HeatmapRequest;
use App\Http\Requests\Habit\StatsRequest;
use App\Http\Requests\Habit\StoreHabitRequest;
use App\Http\Requests\Habit\SummaryRequest;
use App\Http\Requests\Habit\ToggleHabitRequest;
use App\Http\Requests\Habit\UpdateHabitRequest;
use App\Http\Resources\HabitResource;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Support\HabitSummary;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class HabitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $archived = $request->boolean('archived');
        $habits = Habit::query()
            ->when(
                $archived,
                fn ($q) => $q->whereNotNull('archived_at'),
                fn ($q) => $q->whereNull('archived_at'),
            )
            ->with('noteLinks')
            ->orderBy('id')
            ->get();

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
        $state = $request->validated('state'); // null | 'done' | 'skip' | 'none'

        $result = DB::transaction(function () use ($habit, $date, $state) {
            $log = $habit->logs()->where('date', $date)->lockForUpdate()->first();

            // state='none' limpa o dia (apaga o log).
            if ($state === 'none') {
                $log?->delete();

                return ['date' => $date, 'done' => false, 'skipped' => false];
            }

            // Estado alvo: done/skip são explícitos; sem state é o toggle clássico
            // (inverte done e sempre zera skipped).
            [$done, $skipped] = match ($state) {
                'done' => [true, false],
                'skip' => [false, true],
                default => [$log ? ! $log->done : true, false],
            };

            if ($log) {
                $log->done = $done;
                $log->skipped = $skipped;
                $log->save();

                return ['date' => $log->date->toDateString(), 'done' => $log->done, 'skipped' => $log->skipped];
            }

            try {
                $log = $habit->logs()->create(['date' => $date, 'done' => $done, 'skipped' => $skipped]);
            } catch (UniqueConstraintViolationException $e) {
                // Concorrência: outro request criou o log entre o SELECT e o INSERT.
                // Relê com lock e reaplica o estado alvo.
                $log = $habit->logs()->where('date', $date)->lockForUpdate()->first();
                if ($state === null) {
                    $done = ! $log->done; // toggle é relativo ao valor já persistido
                }
                $log->done = $done;
                $log->skipped = $skipped;
                $log->save();
            }

            return ['date' => $log->date->toDateString(), 'done' => $log->done, 'skipped' => $log->skipped];
        });

        return response()->json(['data' => $result]);
    }

    public function archive(Habit $habit): JsonResponse
    {
        $habit->update(['archived_at' => now()]);

        return (new HabitResource($habit))->response();
    }

    public function unarchive(Habit $habit): JsonResponse
    {
        $habit->update(['archived_at' => null]);

        return (new HabitResource($habit))->response();
    }

    public function summary(SummaryRequest $request): JsonResponse
    {
        $weekStart = Carbon::parse($request->validated('week'));
        $weekEnd = $weekStart->copy()->addDays(6);

        $habits = Habit::whereNull('archived_at')->orderBy('id')->get();

        $data = $habits->map(function (Habit $habit) use ($weekStart, $weekEnd) {
            $logsByDate = $habit->logs()
                ->whereBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
                ->get()
                ->keyBy(fn ($log) => $log->date->toDateString());

            return HabitSummary::forHabit($habit, $weekStart, $logsByDate);
        });

        return response()->json(['data' => $data]);
    }

    public function stats(StatsRequest $request): JsonResponse
    {
        $from = Carbon::parse($request->validated('from'))->startOfDay();
        $to = Carbon::parse($request->validated('to'))->startOfDay();
        // Carbon 3 diffInDays() é assinado por padrão; sem `true` aqui só é seguro porque
        // StatsRequest garante `to >= from` (after_or_equal:from) — não remover essa validação.
        $periodDays = $from->diffInDays($to) + 1;

        $habits = Habit::whereNull('archived_at')->orderBy('id')->get();

        $habitsData = $habits->map(function (Habit $habit) use ($from, $to, $periodDays) {
            $doneCount = $habit->logs()
                ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
                ->where('done', true)
                ->count();

            $expected = $habit->target_per_week
                ? ($habit->target_per_week / 7) * $periodDays
                : (float) $periodDays;

            $rate = $expected > 0 ? (int) min(100, round($doneCount / $expected * 100)) : 0;

            return [
                'habit_id' => $habit->id,
                'name' => $habit->name,
                'color' => $habit->color,
                'icon' => $habit->icon,
                'target_per_week' => $habit->target_per_week,
                'done_count' => $doneCount,
                'expected' => round($expected, 1),
                'rate' => $rate,
            ];
        });

        return response()->json(['data' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'period_days' => $periodDays,
            'habits' => $habitsData,
        ]]);
    }

    public function heatmap(HeatmapRequest $request): JsonResponse
    {
        // habit_logs.date já é data-calendário local (sem timezone), então não há
        // conversão de fuso como no heatmap de tarefas — basta contar por dia.
        $fromInput = $request->validated('from');
        $toInput = $request->validated('to');

        if ($fromInput && $toInput) {
            $from = Carbon::createFromFormat('Y-m-d', $fromInput)->startOfDay();
            $to = Carbon::createFromFormat('Y-m-d', $toInput)->startOfDay();
        } else {
            $to = Carbon::parse($request->user()->localToday());
            $from = $to->copy()->subDays(370);
        }

        // Inclui hábitos arquivados: as conclusões passadas continuam contando no histórico.
        $habitIds = Habit::pluck('id');

        $rows = HabitLog::whereIn('habit_id', $habitIds)
            ->where('done', true)
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->selectRaw('DATE(`date`) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        $counts = [];
        foreach ($rows as $day => $count) {
            $counts[substr((string) $day, 0, 10)] = (int) $count;
        }

        return response()->json(['data' => [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            // (object) garante `{}` em vez de `[]` quando vazio — o front espera Record.
            'counts' => (object) $counts,
            'total' => array_sum($counts),
        ]]);
    }
}
