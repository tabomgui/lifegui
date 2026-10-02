<?php

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

// ---------- index ----------

test('lista notas da categoria com campos do frontmatter', function () {
    makeNote('Receitas/Bolo de fubá.md', [
        'tipo' => 'Receita', 'status' => 'novo', 'tags' => ['doce'],
        'fonte' => 'https://ex.com/bolo', 'resumo' => 'Bolo simples', 'data_salvo' => '2026-09-20',
    ]);
    makeNote('Receitas/Pao.md', ['status' => 'estudando']);
    makeNote('IA/Prompting.md', ['status' => 'novo']);

    $this->getJson('/api/brain/notes?category=Receitas')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.path', 'Receitas/Bolo de fubá.md')
        ->assertJsonPath('data.0.title', 'Bolo de fubá')
        ->assertJsonPath('data.0.status', 'novo')
        ->assertJsonPath('data.0.tags.0', 'doce')
        ->assertJsonPath('data.0.fonte', 'https://ex.com/bolo')
        ->assertJsonPath('data.0.resumo', 'Bolo simples')
        ->assertJsonPath('data.1.title', 'Pao');
});

test('filtra por status e busca por texto', function () {
    makeNote('Receitas/Bolo.md', ['status' => 'novo', 'resumo' => 'bolo de chocolate']);
    makeNote('Receitas/Pao.md', ['status' => 'concluido', 'resumo' => 'pão caseiro']);
    makeNote('Receitas/Torta.md', ['status' => 'novo', 'tags' => ['salgado']]);

    $this->getJson('/api/brain/notes?category=Receitas&status=novo')
        ->assertOk()->assertJsonCount(2, 'data');

    $this->getJson('/api/brain/notes?category=Receitas&q=chocolate')
        ->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Bolo');

    $this->getJson('/api/brain/notes?category=Receitas&q=SALGADO')
        ->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Torta');
});

test('lista todas as categorias quando category é omitida', function () {
    makeNote('Receitas/Bolo.md');
    makeNote('IA/Prompting.md');

    $this->getJson('/api/brain/notes')->assertOk()->assertJsonCount(2, 'data');
});

test('category com traversal é rejeitada', function () {
    $this->getJson('/api/brain/notes?category=../outra')->assertOk()->assertJsonCount(0, 'data');
});

// ---------- show ----------

test('mostra nota completa com frontmatter e corpo', function () {
    makeNote('Receitas/Bolo.md', ['status' => 'novo'], "# Bolo\n\ningredientes\n");

    $this->getJson('/api/brain/notes/Receitas/Bolo.md')
        ->assertOk()
        ->assertJsonPath('data.path', 'Receitas/Bolo.md')
        ->assertJsonPath('data.frontmatter.status', 'novo')
        ->assertJsonPath('data.body', "# Bolo\n\ningredientes\n");
});

test('show de nota inexistente ou traversal dá 404', function () {
    $this->getJson('/api/brain/notes/Receitas/Nada.md')->assertNotFound();
    $this->getJson('/api/brain/notes/../fora.md')->assertNotFound();
});

// ---------- store ----------

test('cria nota aplicando o template da categoria', function () {
    File::ensureDirectoryExists(vaultPath().'/Templates');
    file_put_contents(vaultPath().'/Templates/Receita.md', <<<'MD'
---
tipo: receita
tags: []
fonte:
data_salvo: {{date}}
status: novo
resumo:
---

# {{title}}

## Ingredientes

## Modo de preparo

## Minhas anotações

MD);

    $this->postJson('/api/brain/notes', [
        'category' => 'Receitas',
        'title' => 'Bolo de cenoura',
        'fonte' => 'https://ex.com/cenoura',
        'resumo' => 'Clássico com cobertura',
        'tags' => ['doce', 'facil'],
    ])
        ->assertCreated()
        ->assertJsonPath('data.path', 'Receitas/Bolo de cenoura.md')
        ->assertJsonPath('data.frontmatter.status', 'novo')
        ->assertJsonPath('data.frontmatter.fonte', 'https://ex.com/cenoura')
        ->assertJsonPath('data.frontmatter.data_salvo', now()->format('Y-m-d'));

    $raw = file_get_contents(vaultPath().'/Receitas/Bolo de cenoura.md');
    expect($raw)->toContain('# Bolo de cenoura')
        ->toContain('## Ingredientes')
        ->not->toContain('{{date}}')
        ->not->toContain('{{title}}');
});

test('cria nota sem template usando fallback genérico', function () {
    $this->postJson('/api/brain/notes', ['category' => 'IA', 'title' => 'RAG'])
        ->assertCreated()
        ->assertJsonPath('data.frontmatter.status', 'novo');

    expect(file_exists(vaultPath().'/IA/RAG.md'))->toBeTrue();
});

test('sanitiza caracteres inválidos do título e rejeita duplicada', function () {
    $this->postJson('/api/brain/notes', ['category' => 'IA', 'title' => 'a/b: c?*"<>|#[]'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'ab c');

    makeNote('Receitas/Bolo.md');
    $this->postJson('/api/brain/notes', ['category' => 'Receitas', 'title' => 'Bolo'])
        ->assertStatus(409);
});

test('store valida categoria existente e título', function () {
    $this->postJson('/api/brain/notes', ['category' => 'NaoExiste', 'title' => 'X'])->assertStatus(422);
    $this->postJson('/api/brain/notes', ['category' => '../IA', 'title' => 'X'])->assertStatus(422);
    $this->postJson('/api/brain/notes', ['category' => 'IA'])->assertStatus(422);
});

// ---------- update ----------

test('patch de status preserva o corpo byte a byte', function () {
    $body = "# Bolo\n\ntexto  com   espaços\n\n- [ ] item\n";
    makeNote('Receitas/Bolo.md', ['status' => 'novo', 'resumo' => 'r'], $body);

    $this->patchJson('/api/brain/notes/Receitas/Bolo.md', [
        'frontmatter' => ['status' => 'estudando'],
    ])
        ->assertOk()
        ->assertJsonPath('data.frontmatter.status', 'estudando')
        ->assertJsonPath('data.frontmatter.resumo', 'r');

    $parsed = app(App\Support\Vault\VaultService::class)->read('Receitas/Bolo.md');
    expect($parsed['body'])->toBe($body);
});

test('patch troca o corpo mantendo frontmatter', function () {
    makeNote('Receitas/Bolo.md', ['status' => 'novo']);

    $this->patchJson('/api/brain/notes/Receitas/Bolo.md', ['body' => "novo corpo\n"])
        ->assertOk()
        ->assertJsonPath('data.body', "novo corpo\n")
        ->assertJsonPath('data.frontmatter.status', 'novo');
});

test('patch valida status e rejeita nota inexistente', function () {
    makeNote('Receitas/Bolo.md');
    $this->patchJson('/api/brain/notes/Receitas/Bolo.md', ['frontmatter' => ['status' => 'zzz']])
        ->assertStatus(422);
    $this->patchJson('/api/brain/notes/Receitas/Nada.md', ['body' => 'x'])->assertNotFound();
});

test('lista todas as tags do vault, únicas e ordenadas', function () {
    makeNote('Receitas/Frango.md', ['status' => 'novo', 'tags' => ['airfryer', 'proteina']]);
    makeNote('Receitas/Bolo2.md', ['status' => 'novo', 'tags' => ['doce', 'airfryer']]);

    $this->getJson('/api/brain/tags')
        ->assertOk()
        ->assertJson(['data' => ['airfryer', 'doce', 'proteina']]);
});

test('atualiza as tags de uma nota via frontmatter', function () {
    makeNote('Receitas/Frango.md', ['status' => 'novo']);

    $this->patchJson('/api/brain/notes/Receitas/Frango.md', [
        'frontmatter' => ['tags' => ['airfryer', 'rapido']],
    ])->assertOk()->assertJsonPath('data.tags', ['airfryer', 'rapido']);
});

// ---------- destroy ----------

test('excluir move a nota pra .trash e limpa vínculos', function () {
    makeNote('Receitas/Velha.md', ['status' => 'novo']);
    $task = App\Models\Task::factory()->for($this->user)->create();
    App\Models\NoteLink::factory()->for($this->user)->create([
        'linkable_type' => App\Models\Task::class, 'linkable_id' => $task->id,
        'note_path' => 'Receitas/Velha.md',
    ]);

    $this->deleteJson('/api/brain/notes/Receitas/Velha.md')
        ->assertOk()
        ->assertJsonPath('data.path', '.trash/'.now()->format('Y-m-d').'-Velha.md');

    expect(file_exists(vaultPath().'/Receitas/Velha.md'))->toBeFalse()
        ->and(file_exists(vaultPath().'/.trash/'.now()->format('Y-m-d').'-Velha.md'))->toBeTrue()
        ->and(App\Models\NoteLink::count())->toBe(0);

    $this->getJson('/api/brain/notes?category=Receitas')->assertOk()->assertJsonCount(0, 'data');
});

test('excluir rejeita inbox, .trash e nota inexistente', function () {
    makeNote('00-Inbox/captura.md');

    $this->deleteJson('/api/brain/notes/00-Inbox/captura.md')->assertNotFound();
    $this->deleteJson('/api/brain/notes/.trash/x.md')->assertNotFound();
    $this->deleteJson('/api/brain/notes/Receitas/nao-existe.md')->assertNotFound();
});

test('nota nova em inglês usa o heading My notes', function () {
    $this->user->update(['locale' => 'en']);

    $this->postJson('/api/brain/notes', ['category' => 'IA', 'title' => 'Embeddings'])->assertCreated();

    expect(file_get_contents(vaultPath().'/IA/Embeddings.md'))
        ->toContain('## My notes')
        ->not->toContain('## Minhas anotações');
});

test('nota nova em português mantém Minhas anotações', function () {
    $this->postJson('/api/brain/notes', ['category' => 'IA', 'title' => 'Vetores'])->assertCreated();

    expect(file_get_contents(vaultPath().'/IA/Vetores.md'))->toContain('## Minhas anotações');
});
