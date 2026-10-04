<?php

namespace App\Support;

use App\Models\Habit;
use App\Models\HabitLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class HabitSummary
{
    /**
     * Monta o resumo semanal de um hábito: 7 dias a partir de $weekStart,
     * contagem de dias feitos na semana e o streak atual (HabitStreak).
     *
     * @param  Collection<int, HabitLog>  $logs  todos os logs do hábito
     * @param  string  $today  hoje (Y-m-d) no fuso do usuário
     */
    public static function forHabit(Habit $habit, Carbon $weekStart, Collection $logs, string $today): array
    {
        $logsByDate = $logs->keyBy(fn ($log) => $log->date->toDateString());

        $days = [];
        $doneCount = 0;
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i)->toDateString();
            $log = $logsByDate[$date] ?? null;
            $done = (bool) ($log?->done ?? false);
            $skipped = (bool) ($log?->skipped ?? false);
            if ($done) {
                $doneCount++; // done_count conta apenas DONE
            }
            $days[] = ['date' => $date, 'done' => $done, 'skipped' => $skipped];
        }

        return [
            'habit_id' => $habit->id,
            'target_per_week' => $habit->target_per_week,
            'done_count' => $doneCount,
            'streak' => HabitStreak::current($logs, $today),
            'days' => $days,
        ];
    }
}
