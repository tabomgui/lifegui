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
     * contagem de dias feitos na semana e o streak atual.
     *
     * @param  Collection<string, HabitLog>  $logsByDate  mapa 'Y-m-d' => log
     */
    public static function forHabit(Habit $habit, Carbon $weekStart, Collection $logsByDate): array
    {
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
            'streak' => self::streak($habit),
            'days' => $days,
        ];
    }

    /**
     * Streak: caminhando de hoje para trás (dia de graça: se hoje não tem log,
     * começa por ontem):
     *   - um dia DONE (done=true)             incrementa o streak;
     *   - um dia SKIPPED (skipped=true)       é transparente — pula por cima dele,
     *                                         nem incrementa nem quebra;
     *   - um dia MISSED (sem log OU
     *     done=false & skipped=false)         quebra o streak.
     */
    public static function streak(Habit $habit): int
    {
        $logs = $habit->logs()->get()
            ->keyBy(fn ($log) => Carbon::parse($log->date)->toDateString());

        $cursor = Carbon::today();
        if (! $logs->has($cursor->toDateString())) {
            $cursor = $cursor->copy()->subDay(); // dia de graça: começa por ontem
        }

        $streak = 0;
        while (true) {
            $log = $logs->get($cursor->toDateString());
            if ($log === null) {
                break; // MISSED (sem log) quebra
            }
            if ($log->done) {
                $streak++;
            } elseif (! $log->skipped) {
                break; // MISSED (done=false & skipped=false) quebra
            }
            // SKIPPED: transparente, apenas anda para trás
            $cursor = $cursor->copy()->subDay();
        }

        return $streak;
    }
}
