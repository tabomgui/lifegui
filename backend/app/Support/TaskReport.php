<?php
namespace App\Support;

use App\Models\Category;
use App\Models\Task;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Aggregations for the "Relatórios" > Tarefas dashboard.
 *
 * TZ RULE (mirrors the heatmap): every TIMESTAMP (created_at/completed_at, both
 * stored UTC) is bucketed to the client's calendar day with
 * ->setTimezone($tz)->toDateString(). due_date is a plain DATE column and is
 * compared as-is against the tz-derived today/window. today = now in $tz, startOfDay.
 */
class TaskReport
{
    public static function build(string $fromInput, string $toInput, string $tz): array
    {
        $from = Carbon::createFromFormat('Y-m-d', $fromInput, $tz)->startOfDay();
        $to = Carbon::createFromFormat('Y-m-d', $toInput, $tz)->startOfDay();
        $periodDays = (int) round($from->diffInDays($to)) + 1;

        $today = Carbon::now()->setTimezone($tz)->startOfDay();

        // Previous window: same length, immediately before [from,to].
        $prevTo = $from->copy()->subDay();
        $prevFrom = $prevTo->copy()->subDays($periodDays - 1);

        $fromS = $from->toDateString();
        $toS = $to->toDateString();
        $prevFromS = $prevFrom->toDateString();
        $prevToS = $prevTo->toDateString();

        // Personal-scale dataset: load the (already user-scoped) tasks once.
        $tasks = Task::query()->get();
        $categories = Category::query()->get()->keyBy('id');

        $bucket = fn (Carbon $ts) => $ts->copy()->setTimezone($tz)->toDateString();

        $completedInRange = fn (string $f, string $t) => $tasks
            ->filter(fn ($x) => $x->completed_at !== null)
            ->filter(fn ($x) => ($d = $bucket($x->completed_at)) >= $f && $d <= $t)
            ->count();

        $createdInRange = fn (string $f, string $t) => $tasks
            ->filter(fn ($x) => ($d = $bucket($x->created_at)) >= $f && $d <= $t)
            ->count();

        // completed / created
        $completedCount = $completedInRange($fromS, $toS);
        $completedPrev = $completedInRange($prevFromS, $prevToS);
        $completedDelta = $completedCount - $completedPrev;

        $createdCount = $createdInRange($fromS, $toS);
        $createdPrev = $createdInRange($prevFromS, $prevToS);

        $netFlow = $completedCount - $createdCount;
        $netFlowPrev = $completedPrev - $createdPrev;
        $netFlowDelta = $netFlow - $netFlowPrev;

        // ---- LIVE snapshot metrics (period-independent) ----
        $open = $tasks->filter(fn ($x) => $x->status !== 'done');
        $todayS = $today->toDateString();

        $overdue = $open->filter(fn ($x) => $x->due_date !== null && $x->due_date->toDateString() < $todayS);
        $overdueOpenCount = $overdue->count();

        $overdueOldestDays = 0;
        foreach ($overdue as $x) {
            $due = Carbon::parse($x->due_date->toDateString(), $tz)->startOfDay();
            $d = (int) round($due->diffInDays($today));
            $overdueOldestDays = max($overdueOldestDays, $d);
        }

        // overdueDelta: approximation using CURRENT rows only (no status history).
        // net tasks among currently-open work that crossed their due date in last 7d.
        $sevenAgo = $today->copy()->subDays(7);
        $sevenAgoS = $sevenAgo->toDateString();
        $sevenAgoUtc = $sevenAgo->copy()->utc();
        $overdue7 = $open->filter(fn ($x) => $x->due_date !== null
            && $x->due_date->toDateString() < $sevenAgoS
            && $x->created_at->lt($sevenAgoUtc))->count();
        $overdueDelta = $overdueOpenCount - $overdue7;

        // ---- cycle time ----
        $cycleOf = function (string $f, string $t) use ($tasks, $bucket): ?float {
            $diffs = $tasks
                ->filter(fn ($x) => $x->completed_at !== null)
                ->filter(fn ($x) => ($d = $bucket($x->completed_at)) >= $f && $d <= $t)
                ->map(fn ($x) => max(0, $x->completed_at->getTimestamp() - $x->created_at->getTimestamp()) / 86400)
                ->values();

            return self::median($diffs);
        };
        $cycleTimeMedianDays = $cycleOf($fromS, $toS);
        $cycleTimePreviousMedianDays = $cycleOf($prevFromS, $prevToS);
        $cycleTimeDelta = ($cycleTimeMedianDays !== null && $cycleTimePreviousMedianDays !== null)
            ? round($cycleTimeMedianDays - $cycleTimePreviousMedianDays, 1)
            : null;

        // ---- weekly flow ----
        $createdByDate = [];
        $completedByDate = [];
        foreach ($tasks as $x) {
            $cd = $bucket($x->created_at);
            if ($cd >= $fromS && $cd <= $toS) {
                $createdByDate[$cd] = ($createdByDate[$cd] ?? 0) + 1;
            }
            if ($x->completed_at !== null) {
                $od = $bucket($x->completed_at);
                if ($od >= $fromS && $od <= $toS) {
                    $completedByDate[$od] = ($completedByDate[$od] ?? 0) + 1;
                }
            }
        }
        $weekly = [];
        $weekStart = $from->copy()->startOfWeek(Carbon::MONDAY);
        while ($weekStart->lte($to)) {
            $created = 0;
            $completed = 0;
            for ($i = 0; $i < 7; $i++) {
                $d = $weekStart->copy()->addDays($i)->toDateString();
                $created += $createdByDate[$d] ?? 0;
                $completed += $completedByDate[$d] ?? 0;
            }
            $weekly[] = ['weekStart' => $weekStart->toDateString(), 'created' => $created, 'completed' => $completed];
            $weekStart->addWeek();
        }

        // ---- open by category (live) ----
        $openByCategory = [];
        foreach ($open->groupBy(fn ($x) => $x->category_id === null ? '__null' : $x->category_id) as $key => $group) {
            if ($key === '__null') {
                $openByCategory[] = ['categoryId' => null, 'name' => 'Sem categoria', 'color' => '#94a3b8', 'open' => $group->count()];
            } else {
                $cat = $categories->get((int) $key);
                $openByCategory[] = [
                    'categoryId' => (int) $key,
                    'name' => $cat?->name,
                    'color' => $cat?->color,
                    'open' => $group->count(),
                ];
            }
        }
        usort($openByCategory, fn ($a, $b) => $b['open'] <=> $a['open']);

        // ---- aging WIP (live, 7 oldest open) ----
        $agingWip = $open
            ->sortBy(fn ($x) => $x->created_at->getTimestamp())
            ->take(7)
            ->map(function ($x) use ($tz, $today, $categories) {
                $createdLocal = $x->created_at->copy()->setTimezone($tz)->startOfDay();
                return [
                    'id' => $x->id,
                    'title' => $x->title,
                    'categoryColor' => $x->category_id !== null ? $categories->get($x->category_id)?->color : null,
                    'days' => (int) round($createdLocal->diffInDays($today)),
                ];
            })
            ->values()
            ->all();

        // ---- due soon (live, exactly today..today+6) ----
        $dueSoon = [];
        for ($i = 0; $i < 7; $i++) {
            $d = $today->copy()->addDays($i)->toDateString();
            $dueSoon[] = [
                'date' => $d,
                'count' => $open->filter(fn ($x) => $x->due_date !== null && $x->due_date->toDateString() === $d)->count(),
            ];
        }

        // ---- on-time rate ----
        $onTimeOf = function (string $f, string $t) use ($tasks, $bucket): array {
            $set = $tasks
                ->filter(fn ($x) => $x->completed_at !== null && $x->due_date !== null)
                ->filter(fn ($x) => ($d = $bucket($x->completed_at)) >= $f && $d <= $t);
            $total = $set->count();
            $onTime = $set->filter(fn ($x) => $bucket($x->completed_at) <= $x->due_date->toDateString())->count();
            return ['rate' => $total > 0 ? (int) round($onTime / $total * 100) : 0, 'onTime' => $onTime, 'total' => $total];
        };
        $ot = $onTimeOf($fromS, $toS);
        $otPrev = $onTimeOf($prevFromS, $prevToS);
        $onTimeRate = ['rate' => $ot['rate'], 'onTime' => $ot['onTime'], 'total' => $ot['total'], 'previousRate' => $otPrev['rate']];

        // ---- overdue by age bucket (live) ----
        $overdueByAgeBucket = ['1-3' => 0, '4-7' => 0, '8-30' => 0, '30+' => 0];
        foreach ($overdue as $x) {
            $due = Carbon::parse($x->due_date->toDateString(), $tz)->startOfDay();
            $d = max(1, (int) round($due->diffInDays($today)));
            if ($d <= 3) {
                $overdueByAgeBucket['1-3']++;
            } elseif ($d <= 7) {
                $overdueByAgeBucket['4-7']++;
            } elseif ($d <= 30) {
                $overdueByAgeBucket['8-30']++;
            } else {
                $overdueByAgeBucket['30+']++;
            }
        }

        // ---- no due date (live) ----
        $openTotal = $open->count();
        $noDue = $open->filter(fn ($x) => $x->due_date === null)->count();
        $noDueDate = [
            'pct' => $openTotal > 0 ? (int) round($noDue / $openTotal * 100) : 0,
            'count' => $noDue,
            'total' => $openTotal,
        ];

        return [
            'from' => $fromS,
            'to' => $toS,
            'tz' => $tz,
            'periodDays' => $periodDays,
            'previous' => ['from' => $prevFromS, 'to' => $prevToS],
            'completedCount' => $completedCount,
            'completedDelta' => $completedDelta,
            'createdCount' => $createdCount,
            'netFlow' => $netFlow,
            'netFlowDelta' => $netFlowDelta,
            'overdueOpenCount' => $overdueOpenCount,
            'overdueDelta' => $overdueDelta,
            'overdueOldestDays' => $overdueOldestDays,
            'cycleTimeMedianDays' => $cycleTimeMedianDays,
            'cycleTimePreviousMedianDays' => $cycleTimePreviousMedianDays,
            'cycleTimeDelta' => $cycleTimeDelta,
            'weekly' => $weekly,
            'openByCategory' => $openByCategory,
            'agingWip' => $agingWip,
            'dueSoon' => $dueSoon,
            'onTimeRate' => $onTimeRate,
            'overdueByAgeBucket' => (object) $overdueByAgeBucket,
            'noDueDate' => $noDueDate,
        ];
    }

    /** Median rounded to 1 decimal (avg of two middles for even n), null when empty. */
    private static function median(Collection $vals): ?float
    {
        if ($vals->isEmpty()) {
            return null;
        }
        $sorted = $vals->sort()->values();
        $n = $sorted->count();
        $mid = intdiv($n, 2);
        $m = $n % 2 === 0 ? ($sorted[$mid - 1] + $sorted[$mid]) / 2 : $sorted[$mid];

        return round($m, 1);
    }
}
