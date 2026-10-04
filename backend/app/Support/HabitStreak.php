<?php

namespace App\Support;

use App\Models\HabitLog;
use Carbon\CarbonImmutable;

/**
 * Regra única de sequência (streak) de um hábito — página de hábitos,
 * relatórios e tools MCP usam esta classe. Para cada dia:
 *   - DONE (done=true)                       incrementa;
 *   - SKIPPED (skipped=true)                 é transparente: nem conta nem quebra;
 *   - MISSED (sem log, ou done=false e
 *     skipped=false)                         quebra.
 * Hoje nunca quebra (dia de graça): se ainda não foi feito, começa por ontem.
 */
class HabitStreak
{
    private const DONE = 'done';

    private const SKIPPED = 'skipped';

    /**
     * Sequência atual terminando em $today (Y-m-d no fuso do usuário).
     *
     * @param  iterable<HabitLog>  $logs
     */
    public static function current(iterable $logs, string $today): int
    {
        $states = self::states($logs);

        $cursor = CarbonImmutable::parse($today);
        if (($states[$today] ?? null) !== self::DONE) {
            $cursor = $cursor->subDay();
        }

        $streak = 0;
        while (true) {
            $state = $states[$cursor->toDateString()] ?? null;
            if ($state === self::DONE) {
                $streak++;
            } elseif ($state !== self::SKIPPED) {
                return $streak;
            }
            $cursor = $cursor->subDay();
        }
    }

    /**
     * Maior sequência de todo o histórico.
     *
     * @param  iterable<HabitLog>  $logs
     */
    public static function best(iterable $logs): int
    {
        $states = self::states($logs);
        ksort($states);

        $best = 0;
        $run = 0;
        $previous = null;
        foreach ($states as $date => $state) {
            $day = CarbonImmutable::parse($date);
            // Buraco no calendário = dias sem log = MISSED.
            if ($previous !== null && $previous->addDay()->toDateString() !== $date) {
                $run = 0;
            }
            if ($state === self::DONE) {
                $best = max($best, ++$run);
            } elseif ($state !== self::SKIPPED) {
                $run = 0;
            }
            $previous = $day;
        }

        return $best;
    }

    /**
     * @param  iterable<HabitLog>  $logs
     * @return array<string, string|null> 'Y-m-d' => DONE | SKIPPED | null (MISSED)
     */
    private static function states(iterable $logs): array
    {
        $states = [];
        foreach ($logs as $log) {
            $states[$log->date->toDateString()] = match (true) {
                (bool) $log->done => self::DONE,
                (bool) $log->skipped => self::SKIPPED,
                default => null,
            };
        }

        return $states;
    }
}
