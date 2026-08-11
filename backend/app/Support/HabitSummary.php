<?php
namespace App\Support;

use App\Models\Habit;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class HabitSummary
{
    /**
     * Monta o resumo semanal de um hábito: 7 dias a partir de $weekStart,
     * contagem de dias feitos na semana e o streak atual.
     *
     * @param  Collection<string, bool>  $doneByDate  mapa 'Y-m-d' => done
     */
    public static function forHabit(Habit $habit, Carbon $weekStart, Collection $doneByDate): array
    {
        $days = [];
        $doneCount = 0;
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i)->toDateString();
            $done = (bool) ($doneByDate[$date] ?? false);
            if ($done) {
                $doneCount++;
            }
            $days[] = ['date' => $date, 'done' => $done];
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
     * Streak = nº de dias consecutivos com done=true terminando hoje;
     * se hoje ainda não foi marcado, conta a partir de ontem (dia de graça).
     */
    public static function streak(Habit $habit): int
    {
        $doneDates = $habit->logs()->where('done', true)->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $cursor = Carbon::today();
        if (! $doneDates->has($cursor->toDateString())) {
            $cursor = $cursor->copy()->subDay(); // dia de graça: começa por ontem
        }

        $streak = 0;
        while ($doneDates->has($cursor->toDateString())) {
            $streak++;
            $cursor = $cursor->copy()->subDay();
        }

        return $streak;
    }
}
