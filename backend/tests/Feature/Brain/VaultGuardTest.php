<?php

use App\Models\User;
use App\Support\Vault\VaultService;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::makeDirectory($this->vaultRoot.'/'.$this->user->id.'/Receitas', 0755, true);
    $this->vault = app(VaultService::class);
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('resolve aceita nota existente dentro do vault do usuário', function () {
    file_put_contents($this->vault->root().'/Receitas/Bolo.md', "# Bolo\n");

    expect($this->vault->resolve('Receitas/Bolo.md'))
        ->toBe(realpath($this->vault->root().'/Receitas/Bolo.md'));
});

test('resolve rejeita traversal, absoluto, backslash e não-md', function () {
    file_put_contents($this->vaultRoot.'/fora.md', 'fora do vault');
    file_put_contents($this->vault->root().'/Receitas/nota.txt', 'txt');

    expect($this->vault->resolve('../fora.md'))->toBeNull()
        ->and($this->vault->resolve('Receitas/../../fora.md'))->toBeNull()
        ->and($this->vault->resolve('/etc/passwd'))->toBeNull()
        ->and($this->vault->resolve('Receitas\\..\\fora.md'))->toBeNull()
        ->and($this->vault->resolve('Receitas/nota.txt'))->toBeNull()
        ->and($this->vault->resolve(''))->toBeNull();
});

test('resolve rejeita symlink que aponta pra fora do vault', function () {
    file_put_contents($this->vaultRoot.'/segredo.md', 'fora');
    symlink($this->vaultRoot.'/segredo.md', $this->vault->root().'/Receitas/link.md');

    expect($this->vault->resolve('Receitas/link.md'))->toBeNull();
});

test('vault de outro usuário é inalcançável', function () {
    $other = User::factory()->create();
    File::makeDirectory($this->vaultRoot.'/'.$other->id, 0755, true);
    file_put_contents($this->vaultRoot.'/'.$other->id.'/Alheia.md', 'não é sua');

    expect($this->vault->resolve('Alheia.md'))->toBeNull()
        ->and($this->vault->root())->toEndWith('/'.$this->user->id);
});

test('resolve com mustExist=false valida o diretório pai', function () {
    expect($this->vault->resolve('Receitas/Nova.md', mustExist: false))
        ->toBe(realpath($this->vault->root().'/Receitas').'/Nova.md')
        ->and($this->vault->resolve('NaoExiste/Nova.md', mustExist: false))->toBeNull()
        ->and($this->vault->resolve('../Nova.md', mustExist: false))->toBeNull();
});

test('parse e render fazem round-trip preservando o corpo byte a byte', function () {
    $body = "# Título\n\ntexto com --- no meio\n\n- [ ] tarefa\n\núltimo\n";
    $raw = "---\nstatus: novo\ntags:\n  - receita\n---\n".$body;

    $parsed = $this->vault->parse($raw);

    expect($parsed['frontmatter'])->toBe(['status' => 'novo', 'tags' => ['receita']])
        ->and($parsed['body'])->toBe($body);

    $reparsed = $this->vault->parse($this->vault->render($parsed['frontmatter'], $parsed['body']));
    expect($reparsed['body'])->toBe($body)
        ->and($reparsed['frontmatter'])->toBe($parsed['frontmatter']);
});

test('parse tolera nota sem frontmatter e frontmatter inválido', function () {
    expect($this->vault->parse("só corpo\n"))
        ->toBe(['frontmatter' => [], 'body' => "só corpo\n"]);

    $invalid = "---\n:: yaml : inválido : [\n---\ncorpo\n";
    $parsed = $this->vault->parse($invalid);
    expect($parsed['frontmatter'])->toBe([])
        ->and($parsed['body'])->toBe("corpo\n");
});

test('categories ignora 00-Inbox, Templates e ocultos', function () {
    foreach (['00-Inbox', 'Templates', '.obsidian', 'IA', 'Bateria'] as $dir) {
        File::makeDirectory($this->vault->root().'/'.$dir, 0755, true);
    }

    expect($this->vault->categories())->toBe(['Bateria', 'IA', 'Receitas']);
});

test('initialized reflete a existência do diretório do vault', function () {
    expect($this->vault->initialized())->toBeTrue();

    $fresh = User::factory()->create();
    $this->actingAs($fresh);
    expect(app(VaultService::class)->initialized())->toBeFalse();
});
