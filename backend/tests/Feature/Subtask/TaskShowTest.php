<?php
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('mostra a tarefa com suas subtasks ordenadas por position', function () {
    $task = Task::factory()->for($this->user)->create();
    Subtask::factory()->for($task)->create(['title' => 'Segunda', 'position' => 2]);
    Subtask::factory()->for($task)->create(['title' => 'Primeira', 'position' => 1]);

    $response = $this->getJson("/api/tasks/{$task->id}")->assertOk();

    $response->assertJsonPath('data.id', $task->id);
    $response->assertJsonCount(2, 'data.subtasks');
    $response->assertJsonPath('data.subtasks.0.title', 'Primeira');
    $response->assertJsonPath('data.subtasks.1.title', 'Segunda');
});

test('não mostra tarefa de outro usuário (404)', function () {
    $other = Task::factory()->for(User::factory())->create();
    $this->getJson("/api/tasks/{$other->id}")->assertNotFound();
});
