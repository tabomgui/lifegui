<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::ensureDirectoryExists(vaultPath().'/Bateria');
    File::ensureDirectoryExists(vaultPath().'/Calistenia');
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('monta nós e arestas a partir dos wikilinks', function () {
    makeNote('Bateria/Aula 1.md', ['status' => 'novo'], "Ver [[Paradiddle]] e [[Aula 2|a próxima]]\n");
    makeNote('Bateria/Paradiddle.md', [], "básico\n");
    makeNote('Bateria/Aula 2.md', [], "continua de [[Aula 1]]\n");
    makeNote('Calistenia/Flexao.md', [], "sem links\n");

    $res = $this->getJson('/api/brain/graph')->assertOk();

    $nodes = collect($res->json('data.nodes'));
    $links = collect($res->json('data.links'));

    expect($nodes)->toHaveCount(4)
        ->and($nodes->pluck('id'))->toContain('Bateria/Aula 1.md', 'Calistenia/Flexao.md')
        ->and($links)->toHaveCount(3)
        ->and($links->contains(fn ($l) => $l['source'] === 'Bateria/Aula 1.md' && $l['target'] === 'Bateria/Paradiddle.md'))->toBeTrue()
        ->and($links->contains(fn ($l) => $l['source'] === 'Bateria/Aula 1.md' && $l['target'] === 'Bateria/Aula 2.md'))->toBeTrue()
        ->and($links->contains(fn ($l) => $l['source'] === 'Bateria/Aula 2.md' && $l['target'] === 'Bateria/Aula 1.md'))->toBeTrue();

    $aula1 = $nodes->firstWhere('id', 'Bateria/Aula 1.md');
    expect($aula1['category'])->toBe('Bateria')
        ->and($aula1['degree'])->toBe(3);
});

test('wikilink sem alvo vira nó fantasma', function () {
    makeNote('Bateria/Aula 1.md', [], "estudar [[Groove Perdido]]\n");

    $res = $this->getJson('/api/brain/graph')->assertOk();

    $ghost = collect($res->json('data.nodes'))->firstWhere('ghost', true);
    expect($ghost)->not->toBeNull()
        ->and($ghost['title'])->toBe('Groove Perdido')
        ->and(collect($res->json('data.links'))->first()['target'])->toBe($ghost['id']);
});

test('resolve título sem diferenciar maiúsculas e ignora âncora', function () {
    makeNote('Bateria/Aula 1.md', [], "ver [[paradiddle#Execução]]\n");
    makeNote('Bateria/Paradiddle.md', [], "x\n");

    $links = $this->getJson('/api/brain/graph')->assertOk()->json('data.links');
    expect($links)->toHaveCount(1)
        ->and($links[0]['target'])->toBe('Bateria/Paradiddle.md');
});

test('tags do frontmatter viram nós marcados', function () {
    makeNote('Bateria/Aula 1.md', ['tags' => ['groove']], "x\n");
    makeNote('Bateria/Aula 2.md', ['tags' => ['groove', 'rudimento']], "x\n");

    $res = $this->getJson('/api/brain/graph')->assertOk();
    $nodes = collect($res->json('data.nodes'));
    $links = collect($res->json('data.links'));

    $groove = $nodes->firstWhere('id', 'tag:groove');
    expect($groove['tag'])->toBeTrue()
        ->and($groove['title'])->toBe('#groove')
        ->and($groove['degree'])->toBe(2)
        ->and($nodes->firstWhere('id', 'tag:rudimento'))->not->toBeNull()
        ->and($links->where('tag', true))->toHaveCount(3);
});

test('nota mostra backlinks de quem aponta pra ela', function () {
    makeNote('Bateria/Paradiddle.md', [], "base\n");
    makeNote('Bateria/Aula 1.md', [], "ver [[Paradiddle]]\n");
    makeNote('Calistenia/Treino.md', [], "tempo de [[paradiddle]] também\n");

    $this->getJson('/api/brain/notes/Bateria/Paradiddle.md')
        ->assertOk()
        ->assertJsonCount(2, 'data.backlinks')
        ->assertJsonPath('data.backlinks.0.path', 'Bateria/Aula 1.md')
        ->assertJsonPath('data.backlinks.1.category', 'Calistenia');
});

test('vault ausente responde vazio e rota exige auth', function () {
    $fresh = User::factory()->create();
    $this->actingAs($fresh);
    $this->getJson('/api/brain/graph')
        ->assertOk()
        ->assertJsonPath('data.nodes', [])
        ->assertJsonPath('initialized', false);

    $this->app['auth']->forgetGuards();
    $this->getJson('/api/brain/graph')->assertUnauthorized();
});
