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

function vaultPath(): string
{
    return test()->vaultRoot.'/'.test()->user->id;
}

function makeNote(string $relative, array $frontmatter = [], string $body = "corpo\n"): void
{
    $absolute = vaultPath().'/'.$relative;
    File::ensureDirectoryExists(dirname($absolute));
    $yaml = '';
    if ($frontmatter !== []) {
        $lines = collect($frontmatter)
            ->map(fn ($v, $k) => is_array($v) ? "$k: [".implode(', ', $v).']' : "$k: $v")
            ->implode("\n");
        $yaml = "---\n{$lines}\n---\n";
    }
    file_put_contents($absolute, $yaml.$body);
}

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
