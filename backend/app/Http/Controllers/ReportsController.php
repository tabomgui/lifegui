<?php
namespace App\Http\Controllers;

use App\Http\Requests\Report\HabitReportRequest;
use App\Http\Requests\Report\TaskReportRequest;
use App\Support\BrainReport;
use App\Support\HabitReport;
use App\Support\TaskReport;
use App\Support\Vault\VaultService;
use Illuminate\Http\JsonResponse;

/**
 * Thin controller for the aggregation dashboards; heavy logic lives in
 * App\Support\TaskReport / HabitReport (mirrors the HabitSummary pattern).
 */
class ReportsController extends Controller
{
    public function tasks(TaskReportRequest $request): JsonResponse
    {
        [$from, $to, $tz] = $this->window($request, 90);

        return response()->json(['data' => TaskReport::build($from, $to, $tz)]);
    }

    public function habits(HabitReportRequest $request): JsonResponse
    {
        [$from, $to, $tz] = $this->window($request, 30);

        return response()->json(['data' => HabitReport::build($from, $to, $tz)]);
    }

    public function brain(HabitReportRequest $request, VaultService $vault): JsonResponse
    {
        [$from, $to, $tz] = $this->window($request, 30);

        return response()->json(['data' => BrainReport::build($from, $to, $tz, $vault)]);
    }

    /**
     * Resolve the validated window: tz falls back to UTC when unknown (like the
     * heatmap); missing from/to default to the last $defaultDays ending today[tz].
     *
     * @return array{0:string,1:string,2:string}
     */
    private function window($request, int $defaultDays): array
    {
        $tz = (string) $request->validated('tz');
        if (! in_array($tz, timezone_identifiers_list(), true)) {
            $tz = 'UTC';
        }

        $from = $request->validated('from');
        $to = $request->validated('to');

        if (! $from || ! $to) {
            $today = now()->setTimezone($tz)->startOfDay();
            $to = $today->toDateString();
            $from = $today->copy()->subDays($defaultDays - 1)->toDateString();
        }

        return [$from, $to, $tz];
    }
}
