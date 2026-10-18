<?php
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11 12:00:00', 'UTC'));
    $this->actingAs($this->user = User::factory()->create());
});

afterEach(fn () => Carbon::setTestNow());

/** Log a set of done=true dates for a habit. */
function logDone(Habit $habit, array $dates): void
{
    foreach ($dates as $d) {
        HabitLog::factory()->for($habit)->create(['date' => $d, 'done' => true]);
    }
}

test('echoes the window and previous window', function () {
    $res = $this->getJson('/api/reports/habits?from=2026-07-13&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.from', '2026-07-13');
    $res->assertJsonPath('data.to', '2026-08-11');
    $res->assertJsonPath('data.periodDays', 30);
    $res->assertJsonPath('data.previous.to', '2026-07-12');
    $res->assertJsonPath('data.previous.from', '2026-06-13');
});

test('activeHabitsCount excludes archived and other users', function () {
    Habit::factory()->for($this->user)->create();
    Habit::factory()->for($this->user)->create();
    Habit::factory()->for($this->user)->create(['archived_at' => now()]);
    $other = User::factory()->create();
    Habit::factory()->for($other)->create();

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.activeHabitsCount', 2);
});

test('avgAdherence, consistencyPct and consistencyDelta', function () {
    $a = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    $b = Habit::factory()->for($this->user)->create(['target_per_week' => null]);

    // Period [2026-08-05, 2026-08-11], expected = 7 each.
    logDone($a, ['2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08']); // 4 -> 57%
    logDone($b, ['2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']); // 7 -> 100%
    // Previous [2026-07-29, 2026-08-04]: a=2, b=1.
    logDone($a, ['2026-08-03', '2026-08-04']);
    logDone($b, ['2026-08-04']);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.avgAdherence', 79);            // round((57+100)/2)
    $res->assertJsonPath('data.consistencyPct', 79);          // round(11/14*100)
    $res->assertJsonPath('data.consistencyPreviousPct', 21);  // round(3/14*100)
    $res->assertJsonPath('data.consistencyDelta', 58);
});

test('perfectDays, currentPerfectStreak and recordPerfectStreak on daily habits', function () {
    $h1 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    $h2 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);

    $both = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25'];
    logDone($h1, [...$both, '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']);
    logDone($h2, [...$both, '2026-08-05', '2026-08-06', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']); // no 08-07

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    // Window perfect days: 05,06,08,09,10,11 = 6 (07 broken by h2).
    $res->assertJsonPath('data.perfectDays', 6);
    // Ending today 08-11: 08,09,10,11 perfect, 07 not => 4.
    $res->assertJsonPath('data.currentPerfectStreak', 4);
    // All-time longest: 07-20..07-25 = 6.
    $res->assertJsonPath('data.recordPerfectStreak', 6);
});

test('perfect metrics are zero when there are no daily habits', function () {
    $w = Habit::factory()->for($this->user)->create(['target_per_week' => 3]);
    logDone($w, ['2026-08-09', '2026-08-10', '2026-08-11']);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.perfectDays', 0);
    $res->assertJsonPath('data.currentPerfectStreak', 0);
    $res->assertJsonPath('data.recordPerfectStreak', 0);
});

test('currentPerfectStreak uses the grace day when today is not yet perfect', function () {
    $h1 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    $h2 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);

    // 08-09 and 08-10 perfect; today 08-11 only h1 done (not perfect).
    logDone($h1, ['2026-08-09', '2026-08-10', '2026-08-11']);
    logDone($h2, ['2026-08-09', '2026-08-10']);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    // Grace: start at yesterday 08-10, count 08-10, 08-09 => 2.
    $res->assertJsonPath('data.currentPerfectStreak', 2);
});

test('dailyConsistency uses per-day expected weights (daily=1, weekly=target/7)', function () {
    $d = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    $w = Habit::factory()->for($this->user)->create(['target_per_week' => 7]); // weight 1

    logDone($d, ['2026-08-10', '2026-08-11']);
    logDone($w, ['2026-08-10']); // only 08-10

    $res = $this->getJson('/api/reports/habits?from=2026-08-10&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonCount(2, 'data.dailyConsistency');
    $res->assertJsonPath('data.dailyConsistency.0.date', '2026-08-10');
    $res->assertJsonPath('data.dailyConsistency.0.pct', 100); // 2/2
    $res->assertJsonPath('data.dailyConsistency.1.date', '2026-08-11');
    $res->assertJsonPath('data.dailyConsistency.1.pct', 50);  // 1/2
});

test('perHabitStreaks report current (grace) and best day-runs per habit', function () {
    $h1 = Habit::factory()->for($this->user)->create(['name' => 'Exercicio', 'color' => '#10b981', 'target_per_week' => null]);
    $h2 = Habit::factory()->for($this->user)->create(['name' => 'Leitura', 'color' => '#8b5cf6', 'target_per_week' => null]);

    $both = ['2026-07-20', '2026-07-21', '2026-07-22', '2026-07-23', '2026-07-24', '2026-07-25'];
    logDone($h1, [...$both, '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']);
    logDone($h2, [...$both, '2026-08-05', '2026-08-06', '2026-08-08', '2026-08-09', '2026-08-10', '2026-08-11']);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.perHabitStreaks.0.habitId', $h1->id);
    $res->assertJsonPath('data.perHabitStreaks.0.name', 'Exercicio');
    $res->assertJsonPath('data.perHabitStreaks.0.current', 7); // 08-05..08-11
    $res->assertJsonPath('data.perHabitStreaks.0.best', 7);
    $res->assertJsonPath('data.perHabitStreaks.1.habitId', $h2->id);
    $res->assertJsonPath('data.perHabitStreaks.1.current', 4); // 08-08..08-11
    $res->assertJsonPath('data.perHabitStreaks.1.best', 6);    // 07-20..07-25
});

test('perHabitStreaks current is 0 when neither today nor yesterday is done', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    logDone($h, ['2026-08-01', '2026-08-02']); // nothing near today

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.perHabitStreaks.0.current', 0);
    $res->assertJsonPath('data.perHabitStreaks.0.best', 2);
});

test('tenant isolation: another user habits and logs are excluded', function () {
    $other = User::factory()->create();
    $otherHabit = Habit::factory()->for($other)->create(['target_per_week' => null]);
    logDone($otherHabit, ['2026-08-10', '2026-08-11']);

    $mine = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    logDone($mine, ['2026-08-11']);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.activeHabitsCount', 1);
    $res->assertJsonCount(1, 'data.perHabitStreaks');
    $res->assertJsonPath('data.perHabitStreaks.0.habitId', $mine->id);
});

test('empty data returns zeros', function () {
    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.activeHabitsCount', 0);
    $res->assertJsonPath('data.avgAdherence', 0);
    $res->assertJsonPath('data.consistencyPct', 0);
    $res->assertJsonPath('data.perfectDays', 0);
    $res->assertJsonPath('data.currentPerfectStreak', 0);
    $res->assertJsonPath('data.recordPerfectStreak', 0);
    expect($res->json('data.perHabitStreaks'))->toBe([]);
    $res->assertJsonCount(7, 'data.dailyConsistency');
});

test('rejects to before from', function () {
    $this->getJson('/api/reports/habits?from=2026-08-11&to=2026-08-01&tz=UTC')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('rejects window larger than 400 days', function () {
    $this->getJson('/api/reports/habits?from=2025-01-01&to=2026-08-11&tz=UTC')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('perHabitStreaks use the habits page rule: a skipped day neither counts nor breaks', function () {
    $h = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    logDone($h, ['2026-08-08', '2026-08-11']);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-09', 'done' => false, 'skipped' => true]);
    HabitLog::factory()->for($h)->create(['date' => '2026-08-10', 'done' => false, 'skipped' => true]);

    $res = $this->getJson('/api/reports/habits?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.perHabitStreaks.0.current', 2);
    $res->assertJsonPath('data.perHabitStreaks.0.best', 2);
});

test('a skipped daily habit breaks the perfect-day streak', function () {
    $h1 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    $h2 = Habit::factory()->for($this->user)->create(['target_per_week' => null]);
    logDone($h1, ['2026-08-09', '2026-08-10', '2026-08-11']);
    logDone($h2, ['2026-08-09', '2026-08-11']);
    HabitLog::factory()->for($h2)->create(['date' => '2026-08-10', 'done' => false, 'skipped' => true]);

    $res = $this->getJson('/api/reports/habits?from=2026-08-09&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.perfectDays', 2);          // 08-09 and 08-11
    $res->assertJsonPath('data.currentPerfectStreak', 1); // 08-10 skipped breaks
});
