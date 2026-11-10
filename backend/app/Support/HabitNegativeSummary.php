<?php

namespace App\Support;

use App\Models\Habit;
use Illuminate\Support\Collection;
use Carbon\CarbonImmutable;

/**
 * Cálculo de hábito negativo (hábito a largar): um log `done=true` numa data
 * representa RECAÍDA naquele dia, ao contrário do hábito positivo onde done=true
 * é sucesso. Ver HabitSummary para o cálculo do hábito positivo.
 */
class HabitNegativeSummary
{
    private const MARCOS = [1, 3, 7, 14, 30];

    /**
     * @param  Collection<int, \App\Models\HabitLog>  $logs  logs do hábito (qualquer ordem)
     * @param  string  $today  hoje (Y-m-d) no fuso do usuário
     */
    public static function forHabit(Habit $habit, Collection $logs, string $today): array
    {
        $relapseDates = $logs
            ->filter(fn ($log) => (bool) $log->done)
            ->map(fn ($log) => $log->date instanceof \DateTimeInterface ? $log->date->format('Y-m-d') : (string) $log->date)
            ->sort()
            ->values();

        $createdAt = CarbonImmutable::parse($habit->created_at)->toDateString();
        $todayDate = CarbonImmutable::parse($today);

        // Marcos do calendário: criação, cada recaída, hoje — em ordem.
        $boundaries = collect([$createdAt])->merge($relapseDates)->push($today)->unique()->values();

        $recorde = 0;
        for ($i = 0; $i < $boundaries->count() - 1; $i++) {
            $gap = (int) CarbonImmutable::parse($boundaries[$i])->diffInDays(CarbonImmutable::parse($boundaries[$i + 1]));
            $recorde = max($recorde, $gap);
        }

        $lastRelapse = $relapseDates->last();
        $diasSem = (int) ($lastRelapse
            ? CarbonImmutable::parse($lastRelapse)->diffInDays($todayDate)
            : CarbonImmutable::parse($createdAt)->diffInDays($todayDate));

        $recomecos = $relapseDates->count();
        $totalDiasDesdeOCriacao = (int) CarbonImmutable::parse($createdAt)->diffInDays($todayDate);
        $totalDiasSem = max(0, $totalDiasDesdeOCriacao - $recomecos);

        $custo = $habit->estimated_daily_cost !== null ? (float) $habit->estimated_daily_cost : 0.0;
        $economia = round($diasSem * $custo, 2);

        $marcos = collect(self::MARCOS)->map(fn ($dias) => [
            'dias' => $dias,
            'atingido' => $diasSem >= $dias,
        ])->values()->all();

        return [
            'habit_id' => $habit->id,
            'type' => 'negative',
            'dias_sem' => $diasSem,
            'recorde' => $recorde,
            'total_dias_sem' => $totalDiasSem,
            'recomecos' => $recomecos,
            'economia' => $economia,
            'marcos' => $marcos,
        ];
    }
}
