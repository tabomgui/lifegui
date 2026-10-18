<?php

use App\Models\User;
use App\Support\Vault\VaultService;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('mostra a raiz do deploy e o vault do usuário', function () {
    File::ensureDirectoryExists($this->vaultRoot.'/'.$this->user->id);

    $this->getJson('/api/settings/vault')
        ->assertOk()
        ->assertExactJson(['data' => [
            'effective' => $this->vaultRoot,
            'exists' => true,
            'user_vault' => $this->vaultRoot.'/'.$this->user->id,
            'initialized' => true,
        ]]);
});

test('indica vault ainda não inicializado', function () {
    $this->getJson('/api/settings/vault')
        ->assertOk()
        ->assertJsonPath('data.exists', false)
        ->assertJsonPath('data.initialized', false);
});

test('nenhum usuário consegue trocar a raiz dos vaults', function () {
    $this->patchJson('/api/settings/vault', ['vaults_path' => '/etc'])
        ->assertStatus(405);

    expect(app(VaultService::class)->root())->toBe($this->vaultRoot.'/'.$this->user->id);
});

test('exige autenticação', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/settings/vault')->assertUnauthorized();
});
