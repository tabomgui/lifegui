<?php
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('cria subtask com done=false e position incrementando', function () {
    $task = Task::factory()->for($this->user)->create();

    $this->postJson("/api/tasks/{$task->id}/subtasks", ['title' => 'Primeira'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Primeira')
        ->assertJsonPath('data.done', false)
        ->assertJsonPath('data.position', 1);

    $this->postJson("/api/tasks/{$task->id}/subtasks", ['title' => 'Segunda'])
        ->assertCreated()
        ->assertJsonPath('data.position', 2);
});

test('título obrigatório ao criar subtask', function () {
    $task = Task::factory()->for($this->user)->create();
    $this->postJson("/api/tasks/{$task->id}/subtasks", ['title' => ''])->assertStatus(422);
});

test('atualiza done e renomeia subtask', function () {
    $task = Task::factory()->for($this->user)->create();
    $subtask = Subtask::factory()->for($task)->create(['title' => 'Antiga', 'done' => false]);

    $this->patchJson("/api/tasks/{$task->id}/subtasks/{$subtask->id}", ['done' => true])
        ->assertOk()
        ->assertJsonPath('data.done', true)
        ->assertJsonPath('data.title', 'Antiga');

    $this->patchJson("/api/tasks/{$task->id}/subtasks/{$subtask->id}", ['title' => 'Nova'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Nova');
});

test('remove subtask', function () {
    $task = Task::factory()->for($this->user)->create();
    $subtask = Subtask::factory()->for($task)->create();

    $this->deleteJson("/api/tasks/{$task->id}/subtasks/{$subtask->id}")->assertNoContent();
    $this->assertDatabaseMissing('subtasks', ['id' => $subtask->id]);
});

test('apagar a tarefa apaga em cascata as subtasks', function () {
    $task = Task::factory()->for($this->user)->create();
    $subtask = Subtask::factory()->for($task)->create();

    $task->delete();

    $this->assertDatabaseMissing('subtasks', ['id' => $subtask->id]);
});
