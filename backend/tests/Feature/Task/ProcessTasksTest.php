<?php
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
