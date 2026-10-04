<?php

namespace App\Mcp\Tools;

use App\Models\Habit;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Support\Facades\Auth;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('complete_habit')]
#[Description('Marks a habit as done today, by name. Never undoes: if it is already done, it only says so.')]
class CompleteHabitTool extends Tool
{
    public function handle(Request $request): Response
    {
        $request->validate(['name' => ['required', 'string']]);

        $habit = Habit::whereNull('archived_at')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($request->get('name'))])
            ->first();

        if ($habit === null) {
            $nomes = Habit::whereNull('archived_at')->pluck('name')->implode(', ');

            return Response::error(__('mcp.complete_habit.not_found', ['name' => $request->get('name'), 'active' => $nomes]));
        }

        $hoje = Auth::user()->localToday();
        $log = $habit->logs()->where('date', $hoje)->first();

        if ($log !== null && $log->done) {
            return Response::text(__('mcp.complete_habit.already_done', ['name' => $habit->name]));
        }

        if ($log !== null) {
            $log->update(['done' => true, 'skipped' => false]);
        } else {
            $habit->logs()->create(['date' => $hoje, 'done' => true, 'skipped' => false]);
        }

        // Sequência: dias consecutivos com registro feito, terminando hoje.
        $dates = $habit->logs()->where('done', true)->orderByDesc('date')->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->all();
        $streak = 0;
        $cursor = CarbonImmutable::parse($hoje);
        while (in_array($cursor->toDateString(), $dates, true)) {
            $streak++;
            $cursor = $cursor->subDay();
        }

        return Response::text(trans_choice('mcp.complete_habit.done', $streak, ['name' => $habit->name]));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'name' => $schema->string()->description('Habit name (e.g. Reading, Exercise).')->required(),
        ];
    }
}
