<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('vault ausente responde vazio com initialized false', function () {
    $this->getJson('/api/brain/categories')
        ->assertOk()
        ->assertExactJson(['data' => [], 'initialized' => false]);
});

test('lista categorias com contagem por status, ignorando pastas de sistema', function () {
    makeNote('Receitas/Bolo.md', ['status' => 'novo']);
    makeNote('Receitas/Pao.md', ['status' => 'estudando']);
    makeNote('IA/Prompting.md', ['status' => 'novo']);
    makeNote('IA/SemStatus.md');
    makeNote('00-Inbox/captura.md');
    File::ensureDirectoryExists(vaultPath().'/Templates');
    File::ensureDirectoryExists(vaultPath().'/.obsidian');

    $this->getJson('/api/brain/categories')
        ->assertOk()
        ->assertJsonPath('initialized', true)
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.name', 'IA')
        ->assertJsonPath('data.0.counts.novo', 1)
        ->assertJsonPath('data.0.total', 2)
        ->assertJsonPath('data.1.name', 'Receitas')
        ->assertJsonPath('data.1.counts.novo', 1)
        ->assertJsonPath('data.1.counts.estudando', 1)
        ->assertJsonPath('data.1.total', 2);
});

test('exige autenticação', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/brain/categories')->assertUnauthorized();
});

test('init cria o vault zero touch e é idempotente', function () {
    $this->getJson('/api/brain/categories')->assertJsonPath('initialized', false);

    $this->postJson('/api/brain/init')->assertCreated()->assertJsonPath('data.initialized', true);

    expect(is_dir(vaultPath().'/00-Inbox/processados'))->toBeTrue();
    $this->getJson('/api/brain/categories')->assertOk()->assertJsonPath('initialized', true);

    // Segunda chamada não quebra nem apaga nada.
    file_put_contents(vaultPath().'/00-Inbox/captura.md', "oi\n");
    $this->postJson('/api/brain/init')->assertCreated();
    expect(file_exists(vaultPath().'/00-Inbox/captura.md'))->toBeTrue();
});
