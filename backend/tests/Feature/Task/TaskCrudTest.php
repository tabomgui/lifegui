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
