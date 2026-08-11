<?php
use App\Models\Category;
use App\Models\Task;
use App\Models\User;

beforeEach(fn () => $this->actingAs($this->user = User::factory()->create()));

test('processar cria uma tarefa por linha não-vazia em status todo', function () {
    $text = "Ligar pro contador\n\n  Comprar ração  \nPagar boleto";

    $this->postJson('/api/tasks/process', ['text' => $text])
        ->assertCreated()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.status', 'todo');

    expect(Task::count())->toBe(3);
    expect(Task::pluck('title')->all())->toContain('Ligar pro contador', 'Comprar ração', 'Pagar boleto');
});

test('texto vazio é rejeitado', function () {
    $this->postJson('/api/tasks/process', ['text' => "\n  \n"])->assertStatus(422);
});

test('chamadas sucessivas de process não colidem em position (continua do fim da coluna todo)', function () {
    $this->postJson('/api/tasks/process', ['text' => "Uma\nDuas"])->assertCreated();
    $firstBatchMaxPosition = Task::max('position');

    $response = $this->postJson('/api/tasks/process', ['text' => "Três\nQuatro"])
        ->assertCreated();

    $positions = collect($response->json('data'))->pluck('position');
    expect($positions->min())->toBeGreaterThan($firstBatchMaxPosition);
    expect(Task::where('status', 'todo')->pluck('position')->unique())->toHaveCount(4);
});

test('store após process recebe position maior que as tarefas existentes na mesma coluna', function () {
    $this->postJson('/api/tasks/process', ['text' => "Uma\nDuas"])->assertCreated();
    $maxAfterProcess = Task::max('position');

    $this->postJson('/api/tasks', ['title' => 'Nova'])
        ->assertCreated()
        ->assertJsonPath('data.position', $maxAfterProcess + 1);
});

test('processar com category_id atribui a categoria a todas as tarefas criadas', function () {
    $category = Category::factory()->for($this->user)->create();

    $this->postJson('/api/tasks/process', ['text' => "Uma\nDuas", 'category_id' => $category->id])
        ->assertCreated()
        ->assertJsonPath('data.0.category_id', $category->id)
        ->assertJsonPath('data.1.category_id', $category->id);

    expect(Task::where('category_id', $category->id)->count())->toBe(2);
});

test('processar com category_id de outro usuário é rejeitado (422)', function () {
    $other = Category::factory()->for(User::factory())->create();

    $this->postJson('/api/tasks/process', ['text' => "Uma\nDuas", 'category_id' => $other->id])
        ->assertStatus(422);
});
