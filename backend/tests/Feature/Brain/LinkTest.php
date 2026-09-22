<?php

use App\Models\Habit;
use App\Models\NoteLink;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::ensureDirectoryExists(vaultPath().'/Receitas');
    makeNote('Receitas/Bolo.md', ['status' => 'novo']);
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('vincula tarefa a nota e é idempotente', function () {
    $task = Task::factory()->for($this->user)->create();

    $this->postJson('/api/brain/links', [
        'type' => 'task', 'id' => $task->id, 'note_path' => 'Receitas/Bolo.md',
    ])
        ->assertCreated()
        ->assertJsonPath('data.note_path', 'Receitas/Bolo.md')
        ->assertJsonPath('data.exists', true);

    // Repetir devolve o mesmo vínculo, sem duplicar.
    $this->postJson('/api/brain/links', [
        'type' => 'task', 'id' => $task->id, 'note_path' => 'Receitas/Bolo.md',
    ])->assertOk();

    expect(NoteLink::withoutGlobalScopes()->count())->toBe(1);
});

test('vincula hábito e o link aparece no resource', function () {
    $habit = Habit::factory()->for($this->user)->create();

    $this->postJson('/api/brain/links', [
        'type' => 'habit', 'id' => $habit->id, 'note_path' => 'Receitas/Bolo.md',
    ])->assertCreated();

    $this->getJson('/api/habits')
        ->assertOk()
        ->assertJsonPath('data.0.note_links.0.note_path', 'Receitas/Bolo.md')
        ->assertJsonPath('data.0.note_links.0.title', 'Bolo')
        ->assertJsonPath('data.0.note_links.0.exists', true);
});

test('task resource traz note_links e exists false quando o arquivo sumiu', function () {
    $task = Task::factory()->for($this->user)->create();
    NoteLink::factory()->for($this->user)->create([
        'linkable_type' => Task::class, 'linkable_id' => $task->id,
        'note_path' => 'Receitas/Sumiu.md',
    ]);

    $this->getJson('/api/tasks')
        ->assertOk()
        ->assertJsonPath('data.0.note_links.0.exists', false);
});

test('rejeita nota inexistente e recurso de outro usuário', function () {
    $task = Task::factory()->for($this->user)->create();

    $this->postJson('/api/brain/links', [
        'type' => 'task', 'id' => $task->id, 'note_path' => 'Receitas/Nada.md',
    ])->assertStatus(422);

    $other = User::factory()->create();
    $otherTask = Task::factory()->for($other)->create();

    $this->postJson('/api/brain/links', [
        'type' => 'task', 'id' => $otherTask->id, 'note_path' => 'Receitas/Bolo.md',
    ])->assertNotFound();
});

test('remove vínculo; o de outro usuário dá 404', function () {
    $task = Task::factory()->for($this->user)->create();
    $link = NoteLink::factory()->for($this->user)->create([
        'linkable_type' => Task::class, 'linkable_id' => $task->id,
        'note_path' => 'Receitas/Bolo.md',
    ]);

    $this->deleteJson("/api/brain/links/{$link->id}")->assertNoContent();
    expect(NoteLink::withoutGlobalScopes()->count())->toBe(0);

    $other = User::factory()->create();
    $otherTask = Task::factory()->for($other)->create();
    $otherLink = NoteLink::factory()->for($other)->create([
        'linkable_type' => Task::class, 'linkable_id' => $otherTask->id,
        'note_path' => 'X.md',
    ]);

    $this->deleteJson("/api/brain/links/{$otherLink->id}")->assertNotFound();
});

test('nota mostra tasks e habits vinculados', function () {
    $task = Task::factory()->for($this->user)->create(['title' => 'Fazer bolo']);
    NoteLink::factory()->for($this->user)->create([
        'linkable_type' => Task::class, 'linkable_id' => $task->id,
        'note_path' => 'Receitas/Bolo.md',
    ]);

    $this->getJson('/api/brain/notes/Receitas/Bolo.md')
        ->assertOk()
        ->assertJsonPath('data.links.0.type', 'task')
        ->assertJsonPath('data.links.0.name', 'Fazer bolo');
});
