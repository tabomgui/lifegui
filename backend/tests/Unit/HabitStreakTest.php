<?php

use App\Models\HabitLog;
use App\Support\HabitStreak;

// Logs em memória: 'd' = done, 's' = skip, 'x' = log com done=false e skipped=false.
function streakLogs(array $days): array
{
    return collect($days)->map(fn ($state, $date) => new HabitLog([
        'date' => $date,
        'done' => $state === 'd',
        'skipped' => $state === 's',
    ]))->values()->all();
}

test('current conta dias feitos terminando hoje', function () {
    $logs = streakLogs(['2026-08-11' => 'd', '2026-08-12' => 'd', '2026-08-13' => 'd']);

    expect(HabitStreak::current($logs, '2026-08-13'))->toBe(3);
});

test('current usa dia de graça quando hoje ainda não foi feito', function () {
    $logs = streakLogs(['2026-08-11' => 'd', '2026-08-12' => 'd']);

    expect(HabitStreak::current($logs, '2026-08-13'))->toBe(2);
});

test('current: desmarcar hoje (log done=false) não zera a sequência', function () {
    $logs = streakLogs(['2026-08-12' => 'd', '2026-08-13' => 'x']);

    expect(HabitStreak::current($logs, '2026-08-13'))->toBe(1);
});

test('current: pulo é transparente, nem conta nem quebra', function () {
    $logs = streakLogs(['2026-08-10' => 'd', '2026-08-11' => 's', '2026-08-12' => 's', '2026-08-13' => 'd']);

    expect(HabitStreak::current($logs, '2026-08-13'))->toBe(2);
});

test('current: pulado hoje mantém a sequência de ontem', function () {
    $logs = streakLogs(['2026-08-12' => 'd', '2026-08-13' => 's']);

    expect(HabitStreak::current($logs, '2026-08-13'))->toBe(1);
});

test('current: dia sem log ou não feito quebra', function () {
    expect(HabitStreak::current(streakLogs(['2026-08-10' => 'd', '2026-08-12' => 'd']), '2026-08-12'))->toBe(1);
    expect(HabitStreak::current(streakLogs(['2026-08-10' => 'd', '2026-08-11' => 'x', '2026-08-12' => 'd']), '2026-08-12'))->toBe(1);
    expect(HabitStreak::current(streakLogs(['2026-08-10' => 'd']), '2026-08-12'))->toBe(0);
    expect(HabitStreak::current([], '2026-08-12'))->toBe(0);
});

test('best acha a maior sequência com a mesma regra de pulo', function () {
    $logs = streakLogs([
        '2026-07-01' => 'd', '2026-07-02' => 's', '2026-07-03' => 'd', '2026-07-04' => 'd', // 3
        '2026-07-05' => 'x',
        '2026-07-06' => 'd', '2026-07-07' => 'd',                                           // 2
        '2026-07-09' => 'd',                                                                // 1 (07-08 sem log)
    ]);

    expect(HabitStreak::best($logs))->toBe(3);
});

test('best é zero sem nenhum dia feito', function () {
    expect(HabitStreak::best([]))->toBe(0);
    expect(HabitStreak::best(streakLogs(['2026-07-01' => 's', '2026-07-02' => 'x'])))->toBe(0);
});
