<?php
use App\Models\Category;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('lista categorias do usuário ordenadas por position', function () {
    Category::factory()->for($this->user)->create(['name' => 'B', 'position' => 1]);
    Category::factory()->for($this->user)->create(['name' => 'A', 'position' => 0]);

    $this->getJson('/api/categories')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'A')
        ->assertJsonPath('data.1.name', 'B');
});

test('cria categoria', function () {
    $this->postJson('/api/categories', ['name' => 'Trabalho', 'color' => '#f00', 'icon' => 'briefcase'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Trabalho');

    $this->assertDatabaseHas('categories', ['name' => 'Trabalho', 'user_id' => $this->user->id]);
});

test('nome é obrigatório', function () {
    $this->postJson('/api/categories', ['name' => ''])->assertStatus(422);
});

test('atualiza categoria', function () {
    $c = Category::factory()->for($this->user)->create(['name' => 'Velho']);

    $this->patchJson("/api/categories/{$c->id}", ['name' => 'Novo'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Novo');
});

test('apaga categoria e desassocia tarefas (via nullOnDelete definido no Task)', function () {
    $c = Category::factory()->for($this->user)->create();

    $this->deleteJson("/api/categories/{$c->id}")->assertNoContent();
    $this->assertDatabaseMissing('categories', ['id' => $c->id]);
});

test('não acessa categoria de outro usuário (404)', function () {
    $other = Category::factory()->for(User::factory())->create();

    $this->getJson("/api/categories/{$other->id}")->assertNotFound();
    $this->patchJson("/api/categories/{$other->id}", ['name' => 'x'])->assertNotFound();
    $this->deleteJson("/api/categories/{$other->id}")->assertNotFound();
});
