<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::ensureDirectoryExists(vaultPath().'/00-Inbox/processados');
    File::ensureDirectoryExists(vaultPath().'/Receitas');
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('lista capturas do inbox ignorando processados', function () {
    makeNote('00-Inbox/link-bolo.md', ['data_salvo' => '2026-09-20'], "https://ex.com/bolo\nparece bom\n");
    makeNote('00-Inbox/processados/antiga.md');

    $this->getJson('/api/brain/inbox')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.path', '00-Inbox/link-bolo.md')
        ->assertJsonPath('data.0.title', 'link-bolo')
        ->assertJsonPath('data.0.preview', "https://ex.com/bolo\nparece bom\n");
});

test('captura cria arquivo md no inbox', function () {
    $this->postJson('/api/brain/inbox', [
        'content' => "https://ex.com/receita\nvi no grupo\n",
        'title' => 'Receita de pão',
    ])
        ->assertCreated()
        ->assertJsonPath('data.path', '00-Inbox/Receita de pão.md');

    $raw = file_get_contents(vaultPath().'/00-Inbox/Receita de pão.md');
    expect($raw)->toContain('status: novo')
        ->toContain("https://ex.com/receita\nvi no grupo\n");
});

test('captura sem título gera nome com timestamp e content é obrigatório', function () {
    $this->postJson('/api/brain/inbox', ['content' => 'algum texto'])
        ->assertCreated()
        ->assertJsonPath('data.path', fn (string $p) => str_starts_with($p, '00-Inbox/captura-'));

    $this->postJson('/api/brain/inbox', [])->assertStatus(422);
});

test('promote transforma captura em nota e move o original', function () {
    makeNote('00-Inbox/bolo.md', [], "https://ex.com/bolo\nanotei isso\n");

    $this->postJson('/api/brain/inbox/00-Inbox/bolo.md/promote', [
        'category' => 'Receitas',
        'title' => 'Bolo de fubá',
        'resumo' => 'do grupo',
    ])
        ->assertCreated()
        ->assertJsonPath('data.path', 'Receitas/Bolo de fubá.md')
        ->assertJsonPath('data.frontmatter.status', 'novo');

    // Nota criada contém o conteúdo capturado.
    expect(file_get_contents(vaultPath().'/Receitas/Bolo de fubá.md'))
        ->toContain('anotei isso');

    // Original movido pra processados com data, e some da listagem.
    $moved = glob(vaultPath().'/00-Inbox/processados/*bolo.md');
    expect($moved)->toHaveCount(1)
        ->and(file_exists(vaultPath().'/00-Inbox/bolo.md'))->toBeFalse();

    $this->getJson('/api/brain/inbox')->assertOk()->assertJsonCount(0, 'data');
});

test('promote rejeita path fora do inbox e captura inexistente', function () {
    makeNote('Receitas/ja-e-nota.md');

    $this->postJson('/api/brain/inbox/Receitas/ja-e-nota.md/promote', [
        'category' => 'Receitas', 'title' => 'X',
    ])->assertNotFound();

    $this->postJson('/api/brain/inbox/00-Inbox/nada.md/promote', [
        'category' => 'Receitas', 'title' => 'X',
    ])->assertNotFound();
});

test('descartar move a captura pra descartados sem apagar', function () {
    makeNote('00-Inbox/spam.md', [], "não interessa\n");

    $this->deleteJson('/api/brain/inbox/00-Inbox/spam.md')
        ->assertOk()
        ->assertJsonPath('data.path', '00-Inbox/descartados/'.now()->format('Y-m-d').'-spam.md');

    expect(file_exists(vaultPath().'/00-Inbox/spam.md'))->toBeFalse()
        ->and(file_exists(vaultPath().'/00-Inbox/descartados/'.now()->format('Y-m-d').'-spam.md'))->toBeTrue();

    $this->getJson('/api/brain/inbox')->assertOk()->assertJsonCount(0, 'data');
});

test('descartar rejeita path fora do inbox, já descartado e inexistente', function () {
    makeNote('Receitas/Bolo.md');

    $this->deleteJson('/api/brain/inbox/Receitas/Bolo.md')->assertNotFound();
    $this->deleteJson('/api/brain/inbox/00-Inbox/descartados/x.md')->assertNotFound();
    $this->deleteJson('/api/brain/inbox/00-Inbox/nao-existe.md')->assertNotFound();
});
