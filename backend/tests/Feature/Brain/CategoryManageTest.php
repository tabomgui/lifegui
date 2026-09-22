<?php

use App\Models\NoteLink;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::ensureDirectoryExists(vaultPath().'/Receitas');
    File::ensureDirectoryExists(vaultPath().'/IA');
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('cria categoria com ícone e cor', function () {
    $this->postJson('/api/brain/categories', ['name' => 'Bateria', 'icon' => 'music', 'color' => '#3b82f6'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Bateria')
        ->assertJsonPath('data.icon', 'music')
        ->assertJsonPath('data.color', '#3b82f6');

    expect(is_dir(vaultPath().'/Bateria'))->toBeTrue();

    $this->getJson('/api/brain/categories')
        ->assertOk()
        ->assertJsonPath('data.2.name', 'Bateria')
        ->assertJsonPath('data.2.icon', 'music');
});

test('rejeita nomes inválidos, reservados e duplicados', function () {
    $this->postJson('/api/brain/categories', ['name' => '00-Inbox'])->assertStatus(422);
    $this->postJson('/api/brain/categories', ['name' => 'Templates'])->assertStatus(422);
    $this->postJson('/api/brain/categories', ['name' => '../fora'])->assertStatus(422);
    $this->postJson('/api/brain/categories', ['name' => 'a/b'])->assertStatus(422);
    $this->postJson('/api/brain/categories', ['name' => '.oculta'])->assertStatus(422);
    $this->postJson('/api/brain/categories', ['name' => 'Receitas'])->assertStatus(409);
});

test('renomeia categoria movendo pasta, notas e note_links', function () {
    makeNote('Receitas/Bolo.md', ['status' => 'novo']);
    $task = Task::factory()->for($this->user)->create();
    NoteLink::factory()->for($this->user)->create([
        'linkable_type' => Task::class, 'linkable_id' => $task->id,
        'note_path' => 'Receitas/Bolo.md',
    ]);

    $this->patchJson('/api/brain/categories/Receitas', ['name' => 'Cozinha'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Cozinha');

    expect(is_dir(vaultPath().'/Cozinha'))->toBeTrue()
        ->and(is_dir(vaultPath().'/Receitas'))->toBeFalse()
        ->and(file_exists(vaultPath().'/Cozinha/Bolo.md'))->toBeTrue()
        ->and(NoteLink::first()->note_path)->toBe('Cozinha/Bolo.md');
});

test('edita só ícone/cor sem renomear', function () {
    $this->patchJson('/api/brain/categories/IA', ['icon' => 'lightbulb', 'color' => '#8b5cf6'])
        ->assertOk()
        ->assertJsonPath('data.icon', 'lightbulb');

    $this->getJson('/api/brain/categories')
        ->assertJsonPath('data.0.name', 'IA')
        ->assertJsonPath('data.0.icon', 'lightbulb')
        ->assertJsonPath('data.0.color', '#8b5cf6');
});

test('rename para nome existente dá 409 e categoria inexistente 404', function () {
    $this->patchJson('/api/brain/categories/IA', ['name' => 'Receitas'])->assertStatus(409);
    $this->patchJson('/api/brain/categories/Nada', ['name' => 'X'])->assertNotFound();
});

test('reordena categorias e a ordem persiste no index', function () {
    File::ensureDirectoryExists(vaultPath().'/Bateria');

    $this->patchJson('/api/brain/categories/reorder', ['order' => ['Receitas', 'Bateria', 'IA']])
        ->assertOk();

    $this->getJson('/api/brain/categories')
        ->assertJsonPath('data.0.name', 'Receitas')
        ->assertJsonPath('data.1.name', 'Bateria')
        ->assertJsonPath('data.2.name', 'IA');
});

test('pasta nova sem meta entra no fim da ordem', function () {
    $this->patchJson('/api/brain/categories/reorder', ['order' => ['Receitas', 'IA']])->assertOk();
    File::ensureDirectoryExists(vaultPath().'/Zebra');
    File::ensureDirectoryExists(vaultPath().'/Alfa');

    $this->getJson('/api/brain/categories')
        ->assertJsonPath('data.0.name', 'Receitas')
        ->assertJsonPath('data.1.name', 'IA')
        ->assertJsonPath('data.2.name', 'Alfa')
        ->assertJsonPath('data.3.name', 'Zebra');
});

test('apaga categoria vazia; recusa não-vazia', function () {
    $this->deleteJson('/api/brain/categories/IA')->assertNoContent();
    expect(is_dir(vaultPath().'/IA'))->toBeFalse();

    makeNote('Receitas/Bolo.md');
    $this->deleteJson('/api/brain/categories/Receitas')->assertStatus(409);
    expect(is_dir(vaultPath().'/Receitas'))->toBeTrue();
});

test('metadados moram num arquivo oculto do vault', function () {
    $this->postJson('/api/brain/categories', ['name' => 'Bateria', 'icon' => 'music'])->assertCreated();

    $file = vaultPath().'/.lifegui/categories.json';
    expect(file_exists($file))->toBeTrue();
    $json = json_decode((string) file_get_contents($file), true);
    expect($json['meta']['Bateria']['icon'])->toBe('music');
});
