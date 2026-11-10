<?php

use App\Models\Habit;
use App\Models\HabitLog;
use App\Support\HabitNegativeSummary;
use Illuminate\Support\Carbon;

function makeLog(int $habitId, string $date, bool $done): HabitLog
{
    return new HabitLog(['habit_id' => $habitId, 'date' => $date, 'done' => $done, 'skipped' => false]);
}

// setRawAttributes: setAttribute()/fill() no cast 'datetime' do Eloquent chamam
// getConnection() pra resolver o formato de data — inexistente aqui (teste de
// Unit, sem app Laravel bootado). setRawAttributes atribui direto, sem o pipeline
// de cast de escrita.
function makeHabit(array $attrs): Habit
{
    $habit = new Habit;
    $habit->setRawAttributes($attrs, true);

    return $habit;
}

test('sem recaída nenhuma: dias_sem conta desde a criação', function () {
    $habit = makeHabit(['created_at' => Carbon::parse('2026-10-01')]);
    $result = HabitNegativeSummary::forHabit($habit, collect(), '2026-11-10');

    expect($result['dias_sem'])->toBe(40)
        ->and($result['recomecos'])->toBe(0)
        ->and($result['recorde'])->toBe(40)
        ->and($result['total_dias_sem'])->toBe(40);
});

test('uma recaída: dias_sem conta desde a recaída, recorde é o maior intervalo', function () {
    $habit = makeHabit(['id' => 1, 'created_at' => Carbon::parse('2026-10-01')]);
    $logs = collect([makeLog(1, '2026-10-11', true)]); // recaída 10 dias após criação
    $result = HabitNegativeSummary::forHabit($habit, $logs, '2026-11-10');

    // 2026-10-11 -> 2026-11-10 = 30 dias sem
    expect($result['dias_sem'])->toBe(30)
        ->and($result['recomecos'])->toBe(1)
        // maior intervalo: criação->recaída (10) vs recaída->hoje (30) = 30
        ->and($result['recorde'])->toBe(30)
        // total = (hoje-criação) - recomeços = 40 - 1 = 39
        ->and($result['total_dias_sem'])->toBe(39);
});

test('múltiplas recaídas: recorde pega o maior intervalo, não o último', function () {
    $habit = makeHabit(['id' => 1, 'created_at' => Carbon::parse('2026-01-01')]);
    $logs = collect([
        makeLog(1, '2026-01-21', true), // 20 dias após criação (maior)
        makeLog(1, '2026-01-26', true), // 5 dias depois
    ]);
    $result = HabitNegativeSummary::forHabit($habit, $logs, '2026-01-28');

    expect($result['recorde'])->toBe(20) // criação->primeira recaída
        ->and($result['dias_sem'])->toBe(2) // última recaída -> hoje
        ->and($result['recomecos'])->toBe(2);
});

test('economia é 0 sem estimated_daily_cost, calculada quando houver', function () {
    $habit = makeHabit(['created_at' => Carbon::parse('2026-11-01'), 'estimated_daily_cost' => null]);
    expect(HabitNegativeSummary::forHabit($habit, collect(), '2026-11-10')['economia'])->toBe(0.0);

    $habit->estimated_daily_cost = 10.0;
    expect(HabitNegativeSummary::forHabit($habit, collect(), '2026-11-10')['economia'])->toBe(90.0);
});

test('marcos ficam atingidos exatamente nas fronteiras', function () {
    $habit = makeHabit(['created_at' => Carbon::parse('2026-11-01')]);
    $result = HabitNegativeSummary::forHabit($habit, collect(), '2026-11-08'); // 7 dias sem

    $atingidos = collect($result['marcos'])->where('atingido', true)->pluck('dias')->all();
    expect($atingidos)->toBe([1, 3, 7]);
});
