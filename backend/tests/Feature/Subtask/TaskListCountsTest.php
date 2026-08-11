<?php
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('index retorna subtasks_count e subtasks_done_count', function () {
    $task = Task::factory()->for($this->user)->create();
    Subtask::factory()->for($task)->create(['done' => true]);
    Subtask::factory()->for($task)->create(['done' => false]);
    Subtask::factory()->for($task)->create(['done' => false]);

    $response = $this->getJson('/api/tasks')->assertOk();

    $response->assertJsonPath('data.0.subtasks_count', 3);
    $response->assertJsonPath('data.0.subtasks_done_count', 1);
});

test('index retorna zero quando a tarefa não tem subtasks', function () {
    Task::factory()->for($this->user)->create();

    $response = $this->getJson('/api/tasks')->assertOk();

    $response->assertJsonPath('data.0.subtasks_count', 0);
    $response->assertJsonPath('data.0.subtasks_done_count', 0);
});
