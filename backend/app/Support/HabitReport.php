<?php
namespace App\Support;

use App\Models\Habit;
use App\Models\HabitLog;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Aggregations for the "Relatórios" > Habitos dashboard.
 *
 * Habit metrics key on the plain habit_logs.date column (a calendar date, no
 * time), so $tz is used ONLY to derive today and the period boundaries, never to
 * shift log dates. Active habit = archived_at IS NULL (current set applied for
 * the whole window; historical archival state is not reconstructable).
 */
class HabitReport
{
    public static function build(string $fromInput, string $toInput, string $tz): array
    {
        $from = Carbon::createFromFormat('Y-m-d', $fromInput, $tz)->startOfDay();
        $to = Carbon::createFromFormat('Y-m-d', $toInput, $tz)->startOfDay();
        $periodDays = (int) round($from->diffInDays($to)) + 1;

        $today = Carbon::now()->setTimezone($tz)->startOfDay();

        $prevTo = $from->copy()->subDay();
        $prevFrom = $prevTo->copy()->subDays($periodDays - 1);

        $fromS = $from->toDateString();
        $toS = $to->toDateString();
        $prevFromS = $prevFrom->toDateString();
        $prevToS = $prevTo->toDateString();

        $habits = Habit::whereNull('archived_at')->orderBy('id')->get();
        $activeHabitsCount = $habits->count();

        // All-time done=true logs for the active habits (reached only via scoped habit ids).
        $ids = $habits->pluck('id')->all();
        $logs = empty($ids)
            ? collect()
            : HabitLog::whereIn('habit_id', $ids)->where('done', true)->get();

        $doneByHabit = [];   // id => Collection<string Y-m-d> (unique, sorted)
        $doneSet = [];       // id => Collection flip: date => index (has() lookup)
        foreach ($habits as $h) {
            $doneByHabit[$h->id] = collect();
        }
        foreach ($logs as $log) {
            $doneByHabit[$log->habit_id]->push($log->date->toDateString());
        }
        foreach ($doneByHabit as $id => $c) {
            $doneByHabit[$id] = $c->unique()->sort()->values();
            $doneSet[$id] = $doneByHabit[$id]->flip();
        }

        $expectedOf = fn (Habit $h) => $h->target_per_week
            ? ($h->target_per_week / 7) * $periodDays
            : (float) $periodDays;

        $doneInRange = fn ($id, string $f, string $t) => $doneByHabit[$id]
            ->filter(fn ($d) => $d >= $f && $d <= $t)
            ->count();

        // ---- avgAdherence (per-habit rate averaged; reuses /habits/stats formula) ----
        $rates = [];
        foreach ($habits as $h) {
            $exp = $expectedOf($h);
            $done = $doneInRange($h->id, $fromS, $toS);
            $rates[] = $exp > 0 ? min(100, (int) round($done / $exp * 100)) : 0;
        }
        $avgAdherence = count($rates) ? (int) round(array_sum($rates) / count($rates)) : 0;

        // ---- consistencyPct (aggregate: sum done / sum expected) ----
        $consistencyOf = function (string $f, string $t) use ($habits, $expectedOf, $doneInRange): int {
            $sumDone = 0;
            $sumExp = 0.0;
            foreach ($habits as $h) {
                $sumDone += $doneInRange($h->id, $f, $t);
                $sumExp += $expectedOf($h);
            }
            return $sumExp > 0 ? min(100, (int) round($sumDone / $sumExp * 100)) : 0;
        };
        $consistencyPct = $consistencyOf($fromS, $toS);
        $consistencyPreviousPct = $consistencyOf($prevFromS, $prevToS);
        $consistencyDelta = $consistencyPct - $consistencyPreviousPct;

        // ---- perfect days (DAILY habits only) ----
        $dailyIds = $habits->filter(fn ($h) => $h->target_per_week === null)->pluck('id')->all();
        $isPerfect = function (string $d) use ($dailyIds, $doneSet): bool {
            if (empty($dailyIds)) {
                return false;
            }
            foreach ($dailyIds as $id) {
                if (! $doneSet[$id]->has($d)) {
                    return false;
                }
            }
            return true;
        };

        $perfectDays = 0;
        for ($c = $from->copy(); $c->lte($to); $c->addDay()) {
            if ($isPerfect($c->toDateString())) {
                $perfectDays++;
            }
        }

        // currentPerfectStreak: consecutive perfect days ending today, grace day if today not perfect.
        $cursor = $today->copy();
        if (! $isPerfect($cursor->toDateString())) {
            $cursor->subDay();
        }
        $currentPerfectStreak = 0;
        while ($isPerfect($cursor->toDateString())) {
            $currentPerfectStreak++;
            $cursor->subDay();
        }

        // recordPerfectStreak: longest all-time run, bounded by the 400-day guard.
        $recordPerfectStreak = 0;
        if (! empty($dailyIds)) {
            $earliest = null;
            foreach ($dailyIds as $id) {
                $m = $doneByHabit[$id]->first();
                if ($m !== null && ($earliest === null || $m < $earliest)) {
                    $earliest = $m;
                }
            }
            if ($earliest !== null) {
                $start = Carbon::parse($earliest, $tz)->startOfDay();
                $guard = $today->copy()->subDays(399);
                if ($start->lt($guard)) {
                    $start = $guard;
                }
                $run = 0;
                for ($c = $start->copy(); $c->lte($today); $c->addDay()) {
                    if ($isPerfect($c->toDateString())) {
                        $run++;
                        $recordPerfectStreak = max($recordPerfectStreak, $run);
                    } else {
                        $run = 0;
                    }
                }
            }
        }

        // ---- dailyConsistency (per-day analog of consistencyPct) ----
        $denomWeight = 0.0;
        foreach ($habits as $h) {
            $denomWeight += $h->target_per_week ? $h->target_per_week / 7 : 1.0;
        }
        $dailyConsistency = [];
        for ($c = $from->copy(); $c->lte($to); $c->addDay()) {
            $d = $c->toDateString();
            $num = 0;
            foreach ($habits as $h) {
                if ($doneSet[$h->id]->has($d)) {
                    $num++;
                }
            }
            $dailyConsistency[] = [
                'date' => $d,
                'pct' => $denomWeight > 0 ? min(100, (int) round($num / $denomWeight * 100)) : 0,
            ];
        }

        // ---- per-habit streaks ----
        $perHabitStreaks = [];
        foreach ($habits as $h) {
            $set = $doneSet[$h->id];
            $cur = $today->copy();
            if (! $set->has($cur->toDateString())) {
                $cur->subDay();
            }
            $current = 0;
            while ($set->has($cur->toDateString())) {
                $current++;
                $cur->subDay();
            }
            $perHabitStreaks[] = [
                'habitId' => $h->id,
                'name' => $h->name,
                'color' => $h->color,
                'current' => $current,
                'best' => self::longestRun($doneByHabit[$h->id]),
            ];
        }

        return [
            'from' => $fromS,
            'to' => $toS,
            'tz' => $tz,
            'periodDays' => $periodDays,
            'previous' => ['from' => $prevFromS, 'to' => $prevToS],
            'activeHabitsCount' => $activeHabitsCount,
            'avgAdherence' => $avgAdherence,
            'consistencyPct' => $consistencyPct,
            'consistencyPreviousPct' => $consistencyPreviousPct,
            'consistencyDelta' => $consistencyDelta,
            'perfectDays' => $perfectDays,
            'currentPerfectStreak' => $currentPerfectStreak,
            'recordPerfectStreak' => $recordPerfectStreak,
            'dailyConsistency' => $dailyConsistency,
            'perHabitStreaks' => $perHabitStreaks,
        ];
    }

    /** Longest run of consecutive calendar days in a set of Y-m-d strings. */
    private static function longestRun(Collection $dates): int
    {
        if ($dates->isEmpty()) {
            return 0;
        }
        $sorted = $dates->unique()->sort()->values();
        $best = 1;
        $run = 1;
        for ($i = 1; $i < $sorted->count(); $i++) {
            $prev = Carbon::parse($sorted[$i - 1]);
            $cur = Carbon::parse($sorted[$i]);
            $run = $prev->copy()->addDay()->toDateString() === $cur->toDateString() ? $run + 1 : 1;
            $best = max($best, $run);
        }

        return $best;
    }
}
