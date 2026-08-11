<?php
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('não cria subtask sob tarefa de outro usuário (404)', function () {
    $foreignTask = Task::factory()->for(User::factory())->create();

    $this->postJson("/api/tasks/{$foreignTask->id}/subtasks", ['title' => 'X'])->assertNotFound();
});

test('não atualiza/apaga subtask via tarefa de outro usuário (404)', function () {
    $foreignUser = User::factory()->create();
    $foreignTask = Task::factory()->for($foreignUser)->create();
    $foreignSubtask = Subtask::factory()->for($foreignTask)->create();

    $this->patchJson("/api/tasks/{$foreignTask->id}/subtasks/{$foreignSubtask->id}", ['done' => true])
        ->assertNotFound();
    $this->deleteJson("/api/tasks/{$foreignTask->id}/subtasks/{$foreignSubtask->id}")
        ->assertNotFound();
});

test('não atualiza/apaga subtask através de uma tarefa que não é sua pai (404)', function () {
    $taskA = Task::factory()->for($this->user)->create();
    $taskB = Task::factory()->for($this->user)->create();
    $subtaskOfA = Subtask::factory()->for($taskA)->create();

    $this->patchJson("/api/tasks/{$taskB->id}/subtasks/{$subtaskOfA->id}", ['done' => true])
        ->assertNotFound();
    $this->deleteJson("/api/tasks/{$taskB->id}/subtasks/{$subtaskOfA->id}")
        ->assertNotFound();
});
