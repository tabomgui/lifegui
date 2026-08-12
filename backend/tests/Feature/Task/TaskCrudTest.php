<?php
use App\Models\Category;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('lista tarefas, com filtro por categoria e status', function () {
    $cat = Category::factory()->for($this->user)->create();
    Task::factory()->for($this->user)->create(['title' => 'A', 'category_id' => $cat->id, 'status' => 'todo']);
    Task::factory()->for($this->user)->create(['title' => 'B', 'status' => 'done']);

    $this->getJson('/api/tasks')->assertOk()->assertJsonCount(2, 'data');
    $this->getJson("/api/tasks?category_id={$cat->id}")->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/tasks?status=done')->assertOk()->assertJsonCount(1, 'data');
});

test('cria tarefa em todo por padrão', function () {
    $this->postJson('/api/tasks', ['title' => 'Nova'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Nova')
        ->assertJsonPath('data.status', 'todo');
});

test('título obrigatório', function () {
    $this->postJson('/api/tasks', ['title' => ''])->assertStatus(422);
});

test('atualiza status e position (mover no kanban)', function () {
    $task = Task::factory()->for($this->user)->create(['status' => 'todo', 'position' => 0]);

    $this->patchJson("/api/tasks/{$task->id}", ['status' => 'doing', 'position' => 3])
        ->assertOk()
        ->assertJsonPath('data.status', 'doing')
        ->assertJsonPath('data.position', 3);
});

test('status inválido é rejeitado', function () {
    $task = Task::factory()->for($this->user)->create();
    $this->patchJson("/api/tasks/{$task->id}", ['status' => 'invalido'])->assertStatus(422);
});

test('apaga tarefa', function () {
    $task = Task::factory()->for($this->user)->create();
    $this->deleteJson("/api/tasks/{$task->id}")->assertNoContent();
    $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
});

test('não acessa tarefa de outro usuário (404)', function () {
    $other = Task::factory()->for(User::factory())->create();
    $this->patchJson("/api/tasks/{$other->id}", ['status' => 'done'])->assertNotFound();
    $this->deleteJson("/api/tasks/{$other->id}")->assertNotFound();
});

test('não pode associar tarefa a categoria de outro usuário (422)', function () {
    $foreignCategory = Category::factory()->for(User::factory())->create();

    $this->postJson('/api/tasks', ['title' => 'Nova', 'category_id' => $foreignCategory->id])
        ->assertStatus(422);

    $task = Task::factory()->for($this->user)->create();
    $this->patchJson("/api/tasks/{$task->id}", ['category_id' => $foreignCategory->id])
        ->assertStatus(422);
});

test('cria tarefa com due_date persiste e retorna a data', function () {
    $this->postJson('/api/tasks', ['title' => 'Com prazo', 'due_date' => '2026-08-20'])
        ->assertCreated()
        ->assertJsonPath('data.due_date', '2026-08-20');

    $this->assertDatabaseHas('tasks', ['title' => 'Com prazo', 'due_date' => '2026-08-20']);
});

test('cria tarefa sem due_date retorna null', function () {
    $this->postJson('/api/tasks', ['title' => 'Sem prazo'])
        ->assertCreated()
        ->assertJsonPath('data.due_date', null);
});

test('atualiza due_date da tarefa (define e depois limpa)', function () {
    $task = Task::factory()->for($this->user)->create(['due_date' => null]);

    $this->patchJson("/api/tasks/{$task->id}", ['due_date' => '2026-09-01'])
        ->assertOk()
        ->assertJsonPath('data.due_date', '2026-09-01');

    $this->patchJson("/api/tasks/{$task->id}", ['due_date' => null])
        ->assertOk()
        ->assertJsonPath('data.due_date', null);
});

test('due_date inválido é rejeitado (422)', function () {
    $this->postJson('/api/tasks', ['title' => 'Data ruim', 'due_date' => 'nao-e-data'])
        ->assertStatus(422);

    $this->postJson('/api/tasks', ['title' => 'Data ruim', 'due_date' => '2026-13-40'])
        ->assertStatus(422);
});

test('mover tarefa para done define completed_at', function () {
    $task = Task::factory()->for($this->user)->create(['status' => 'todo']);

    $response = $this->patchJson("/api/tasks/{$task->id}", ['status' => 'done']);

    $response->assertOk();
    expect($task->fresh()->completed_at)->not->toBeNull();
});

test('mover tarefa de done de volta para todo/doing limpa completed_at', function () {
    $task = Task::factory()->for($this->user)->create(['status' => 'done', 'completed_at' => now()]);

    $this->patchJson("/api/tasks/{$task->id}", ['status' => 'doing'])->assertOk();

    expect($task->fresh()->completed_at)->toBeNull();
});

test('cliente não pode definir completed_at diretamente', function () {
    $task = Task::factory()->for($this->user)->create(['status' => 'todo']);

    $this->patchJson("/api/tasks/{$task->id}", ['completed_at' => '2020-01-01 00:00:00'])->assertOk();

    expect($task->fresh()->completed_at)->toBeNull();
});

test('criar tarefa já como done define completed_at', function () {
    $response = $this->postJson('/api/tasks', ['title' => 'Feita já', 'status' => 'done']);

    $response->assertCreated();
    $task = Task::find($response->json('data.id'));
    expect($task->completed_at)->not->toBeNull();
});

test('tarefa recém-criada tem is_priority=false por padrão e o resource expõe o campo', function () {
    $this->postJson('/api/tasks', ['title' => 'Comum'])
        ->assertCreated()
        ->assertJsonPath('data.is_priority', false);
});

test('PATCH alterna is_priority da tarefa (marca e desmarca)', function () {
    $task = Task::factory()->for($this->user)->create();

    $this->patchJson("/api/tasks/{$task->id}", ['is_priority' => true])
        ->assertOk()
        ->assertJsonPath('data.is_priority', true);
    expect($task->fresh()->is_priority)->toBeTrue();

    $this->patchJson("/api/tasks/{$task->id}", ['is_priority' => false])
        ->assertOk()
        ->assertJsonPath('data.is_priority', false);
    expect($task->fresh()->is_priority)->toBeFalse();
});

test('não pode alternar is_priority de tarefa de outro usuário (404)', function () {
    $other = Task::factory()->for(User::factory())->create();

    $this->patchJson("/api/tasks/{$other->id}", ['is_priority' => true])->assertNotFound();
});
