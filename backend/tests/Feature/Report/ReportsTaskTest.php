<?php
use App\Models\Category;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow(Carbon::parse('2026-08-11 12:00:00', 'UTC'));
    $this->actingAs($this->user = User::factory()->create());
});

afterEach(fn () => Carbon::setTestNow());

/** Create a task and force its created_at (bypasses timestamp auto-fill). */
function taskWithCreatedAt(User $user, array $attrs, string $createdAt): Task
{
    $t = Task::factory()->for($user)->create($attrs);
    Task::query()->whereKey($t->id)->update(['created_at' => $createdAt]);
    return $t->refresh();
}

test('echoes the validated window, periodDays and previous window', function () {
    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.from', '2026-08-05');
    $res->assertJsonPath('data.to', '2026-08-11');
    $res->assertJsonPath('data.tz', 'UTC');
    $res->assertJsonPath('data.periodDays', 7);
    $res->assertJsonPath('data.previous.to', '2026-08-04');
    $res->assertJsonPath('data.previous.from', '2026-07-29');
});

test('completedCount and completedDelta compare against the previous window', function () {
    // Period [2026-08-05, 2026-08-11]: 3 completions.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC')]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-08 10:00', 'UTC')]);
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-10 10:00', 'UTC')]);
    // Previous [2026-07-29, 2026-08-04]: 1 completion.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-02 10:00', 'UTC')]);
    // Outside both windows.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-07-01 10:00', 'UTC')]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.completedCount', 3);
    $res->assertJsonPath('data.completedDelta', 2);
});

test('createdCount, netFlow and netFlowDelta', function () {
    // Period completions (created in period too): 2 done, created 2026-08-05.
    $d1 = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC')]);
    $d2 = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-07 10:00', 'UTC')]);
    Task::query()->whereKey([$d1->id, $d2->id])->update(['created_at' => '2026-08-05 09:00:00']);
    // Period open tasks created in period: 3 (created 2026-08-06).
    taskWithCreatedAt($this->user, ['status' => 'todo'], '2026-08-06 09:00:00');
    taskWithCreatedAt($this->user, ['status' => 'todo'], '2026-08-06 09:00:00');
    taskWithCreatedAt($this->user, ['status' => 'todo'], '2026-08-06 09:00:00');
    // Previous window: 1 completion (created + completed 2026-08-02) and 1 created-only 2026-08-02.
    $p1 = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-02 10:00', 'UTC')]);
    Task::query()->whereKey($p1->id)->update(['created_at' => '2026-08-02 09:00:00']);
    taskWithCreatedAt($this->user, ['status' => 'todo'], '2026-08-02 09:00:00');

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    // createdCount(period) = 2 done + 3 open = 5. completedCount = 2. netFlow = -3.
    $res->assertJsonPath('data.createdCount', 5);
    $res->assertJsonPath('data.completedCount', 2);
    $res->assertJsonPath('data.netFlow', -3);
    // previous: completed 1, created 2 => netFlowPrev = -1. delta = -3 - (-1) = -2.
    $res->assertJsonPath('data.netFlowDelta', -2);
});

test('overdue live metrics: count, oldest days and 7-day delta approximation', function () {
    // Overdue open tasks (today = 2026-08-11).
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-07-08']); // 34 days
    Task::factory()->for($this->user)->create(['status' => 'doing', 'due_date' => '2026-08-05']); // 6 days
    // Not overdue (future due date).
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-20']);
    // Done tasks never count even if past due.
    Task::factory()->for($this->user)->create(['status' => 'done', 'due_date' => '2026-07-01', 'completed_at' => now()]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.overdueOpenCount', 2);
    $res->assertJsonPath('data.overdueOldestDays', 34);
    // 7 days ago = 2026-08-04. The 2026-07-08 task was already overdue then AND
    // created before 2026-08-04 (factory created_at = now = 2026-08-11)? No —
    // created_at is now, so it does NOT satisfy created_at < 7d-ago; both cross
    // in last 7d => overdue7 = 0, delta = 2.
    $res->assertJsonPath('data.overdueDelta', 2);
});

test('overdueByAgeBucket and overdueOldestDays partition the overdue set', function () {
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-09']); // 2 -> 1-3
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-05']); // 6 -> 4-7
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-07-20']); // 22 -> 8-30
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-06-01']); // 71 -> 30+

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.overdueByAgeBucket.1-3', 1);
    $res->assertJsonPath('data.overdueByAgeBucket.4-7', 1);
    $res->assertJsonPath('data.overdueByAgeBucket.8-30', 1);
    $res->assertJsonPath('data.overdueByAgeBucket.30+', 1);
    $res->assertJsonPath('data.overdueOpenCount', 4);
});

test('cycleTime median over completions in the window', function () {
    // Period completions with known cycle times.
    // task A: created 2026-08-04 10:00, completed 2026-08-06 10:00 => 2.0 days
    $a = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC')]);
    Task::query()->whereKey($a->id)->update(['created_at' => '2026-08-04 10:00:00']);
    // task B: created 2026-08-05 10:00, completed 2026-08-09 10:00 => 4.0 days
    $b = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-09 10:00', 'UTC')]);
    Task::query()->whereKey($b->id)->update(['created_at' => '2026-08-05 10:00:00']);
    // task C: created 2026-08-07 10:00, completed 2026-08-10 10:00 => 3.0 days
    $c = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-10 10:00', 'UTC')]);
    Task::query()->whereKey($c->id)->update(['created_at' => '2026-08-07 10:00:00']);
    // previous window completion: created 2026-08-01, completed 2026-08-02 => 1.0 day
    $p = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-02 10:00', 'UTC')]);
    Task::query()->whereKey($p->id)->update(['created_at' => '2026-08-01 10:00:00']);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    // Whole-number floats serialize to JSON integers (json_encode(3.0) === "3").
    $res->assertJsonPath('data.cycleTimeMedianDays', 3); // median(2,4,3) = 3
    $res->assertJsonPath('data.cycleTimePreviousMedianDays', 1);
    $res->assertJsonPath('data.cycleTimeDelta', 2);
});

test('cycleTime is null when no completions in the window', function () {
    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.cycleTimeMedianDays', null);
    $res->assertJsonPath('data.cycleTimeDelta', null);
});

test('weekly spans every ISO week and counts by tz-local date inside the window', function () {
    // Window 2026-08-05..2026-08-11 spans ISO weeks starting 2026-08-03 and 2026-08-10.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC')]); // week 08-03
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-10 10:00', 'UTC')]); // week 08-10
    taskWithCreatedAt($this->user, ['status' => 'todo'], '2026-08-05 09:00:00'); // created week 08-03

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.weekly.0.weekStart', '2026-08-03');
    $res->assertJsonPath('data.weekly.1.weekStart', '2026-08-10');
    $res->assertJsonPath('data.weekly.0.completed', 1);
    $res->assertJsonPath('data.weekly.1.completed', 1);
    // created count in first week: the open task created 08-05, plus the two done
    // tasks created by factory at now()=2026-08-11 (week 08-10).
    $res->assertJsonPath('data.weekly.0.created', 1);
    $res->assertJsonPath('data.weekly.1.created', 2);
});

test('openByCategory groups live open tasks and folds uncategorized into a synthetic bucket', function () {
    $work = Category::factory()->for($this->user)->create(['name' => 'Trabalho', 'color' => '#3b82f6']);
    Task::factory()->for($this->user)->create(['status' => 'todo', 'category_id' => $work->id]);
    Task::factory()->for($this->user)->create(['status' => 'doing', 'category_id' => $work->id]);
    Task::factory()->for($this->user)->create(['status' => 'todo', 'category_id' => null]);
    // Done tasks excluded.
    Task::factory()->for($this->user)->create(['status' => 'done', 'category_id' => $work->id, 'completed_at' => now()]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.openByCategory.0.categoryId', $work->id);
    $res->assertJsonPath('data.openByCategory.0.name', 'Trabalho');
    $res->assertJsonPath('data.openByCategory.0.color', '#3b82f6');
    $res->assertJsonPath('data.openByCategory.0.open', 2);
    $res->assertJsonPath('data.openByCategory.1.categoryId', null);
    $res->assertJsonPath('data.openByCategory.1.name', 'Sem categoria');
    $res->assertJsonPath('data.openByCategory.1.color', '#94a3b8');
    $res->assertJsonPath('data.openByCategory.1.open', 1);
});

test('agingWip lists up to 7 oldest open tasks with local-day age', function () {
    $cat = Category::factory()->for($this->user)->create(['color' => '#8b5cf6']);
    $old = taskWithCreatedAt($this->user, ['status' => 'todo', 'title' => 'Old', 'category_id' => $cat->id], '2026-07-01 09:00:00');
    taskWithCreatedAt($this->user, ['status' => 'todo', 'title' => 'New'], '2026-08-10 09:00:00');
    // Done task excluded.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => now()]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.agingWip.0.id', $old->id);
    $res->assertJsonPath('data.agingWip.0.title', 'Old');
    $res->assertJsonPath('data.agingWip.0.categoryColor', '#8b5cf6');
    $res->assertJsonPath('data.agingWip.0.days', 41); // 2026-07-01 -> 2026-08-11
    $res->assertJsonPath('data.agingWip.1.categoryColor', null);
});

test('dueSoon returns exactly 7 days from today with per-day open counts', function () {
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-11']);
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-11']);
    Task::factory()->for($this->user)->create(['status' => 'doing', 'due_date' => '2026-08-13']);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonCount(7, 'data.dueSoon');
    $res->assertJsonPath('data.dueSoon.0.date', '2026-08-11');
    $res->assertJsonPath('data.dueSoon.0.count', 2);
    $res->assertJsonPath('data.dueSoon.2.date', '2026-08-13');
    $res->assertJsonPath('data.dueSoon.2.count', 1);
    $res->assertJsonPath('data.dueSoon.6.date', '2026-08-17');
    $res->assertJsonPath('data.dueSoon.6.count', 0);
});

test('onTimeRate over completed tasks that have a due date', function () {
    // On time: completed 2026-08-06 <= due 2026-08-10.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC'), 'due_date' => '2026-08-10']);
    // On time exactly on due date.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-08 10:00', 'UTC'), 'due_date' => '2026-08-08']);
    // Late: completed 2026-08-09 > due 2026-08-06.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-09 10:00', 'UTC'), 'due_date' => '2026-08-06']);
    // No due date -> excluded from onTime set.
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-09 10:00', 'UTC'), 'due_date' => null]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.onTimeRate.total', 3);
    $res->assertJsonPath('data.onTimeRate.onTime', 2);
    $res->assertJsonPath('data.onTimeRate.rate', 67); // round(2/3*100)
    $res->assertJsonPath('data.onTimeRate.previousRate', 0);
});

test('noDueDate over the live open set', function () {
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => null]);
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => null]);
    Task::factory()->for($this->user)->create(['status' => 'todo', 'due_date' => '2026-08-20']);
    // Done excluded from denominator.
    Task::factory()->for($this->user)->create(['status' => 'done', 'due_date' => null, 'completed_at' => now()]);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.noDueDate.total', 3);
    $res->assertJsonPath('data.noDueDate.count', 2);
    $res->assertJsonPath('data.noDueDate.pct', 67);
});

test('tenant isolation: another user data is excluded', function () {
    $other = User::factory()->create();
    Task::factory()->for($other)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 10:00', 'UTC')]);
    Task::factory()->for($other)->create(['status' => 'todo', 'due_date' => '2026-07-01']);

    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.completedCount', 0);
    $res->assertJsonPath('data.overdueOpenCount', 0);
    $res->assertJsonPath('data.noDueDate.total', 0);
});

test('tz bucketing lands a late-UTC completion on the prior local day', function () {
    // 2026-08-06 02:00 UTC = 2026-08-05 23:00 in America/Sao_Paulo (UTC-3).
    Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => Carbon::parse('2026-08-06 02:00', 'UTC')]);

    // Window that includes 08-05 but not 08-06.
    $res = $this->getJson('/api/reports/tasks?from=2026-08-01&to=2026-08-05&tz=America/Sao_Paulo')->assertOk();
    $res->assertJsonPath('data.completedCount', 1);

    // The same completion is OUTSIDE a window ending 08-04 (would be in on UTC bucketing).
    $res2 = $this->getJson('/api/reports/tasks?from=2026-08-06&to=2026-08-11&tz=America/Sao_Paulo')->assertOk();
    $res2->assertJsonPath('data.completedCount', 0);
});

test('empty data returns zeros and null cycle time', function () {
    $res = $this->getJson('/api/reports/tasks?from=2026-08-05&to=2026-08-11&tz=UTC')->assertOk();

    $res->assertJsonPath('data.completedCount', 0);
    $res->assertJsonPath('data.createdCount', 0);
    $res->assertJsonPath('data.netFlow', 0);
    $res->assertJsonPath('data.overdueOpenCount', 0);
    $res->assertJsonPath('data.overdueOldestDays', 0);
    $res->assertJsonPath('data.cycleTimeMedianDays', null);
    $res->assertJsonPath('data.onTimeRate.rate', 0);
    $res->assertJsonPath('data.noDueDate.pct', 0);
    $res->assertJsonCount(7, 'data.dueSoon');
    expect($res->json('data.openByCategory'))->toBe([]);
    expect($res->json('data.agingWip'))->toBe([]);
});

test('rejects to before from', function () {
    $this->getJson('/api/reports/tasks?from=2026-08-11&to=2026-08-01&tz=UTC')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});

test('rejects window larger than 400 days', function () {
    $this->getJson('/api/reports/tasks?from=2025-01-01&to=2026-08-11&tz=UTC')
        ->assertStatus(422)
        ->assertJsonValidationErrors('to');
});
