<?php

use App\Models\AppSetting;
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

test('mostra a configuração com fallback quando não há valor salvo', function () {
    File::ensureDirectoryExists($this->vaultRoot.'/'.$this->user->id);

    $this->getJson('/api/settings/vault')
        ->assertOk()
        ->assertJsonPath('data.vaults_path', null)
        ->assertJsonPath('data.effective', $this->vaultRoot)
        ->assertJsonPath('data.exists', true)
        ->assertJsonPath('data.initialized', true);
});

test('salva a raiz e o VaultService passa a usá-la', function () {
    $other = sys_get_temp_dir().'/lifegui-vault-alt-'.uniqid();
    File::ensureDirectoryExists($other.'/'.$this->user->id);

    $this->patchJson('/api/settings/vault', ['vaults_path' => $other])
        ->assertOk()
        ->assertJsonPath('data.vaults_path', $other)
        ->assertJsonPath('data.effective', $other)
        ->assertJsonPath('data.initialized', true);

    expect(app(VaultService::class)->root())->toBe($other.'/'.$this->user->id);

    File::deleteDirectory($other);
});

test('valor vazio limpa e volta pro fallback', function () {
    AppSetting::put('vaults_path', '/qualquer/coisa');

    $this->patchJson('/api/settings/vault', ['vaults_path' => null])
        ->assertOk()
        ->assertJsonPath('data.vaults_path', null)
        ->assertJsonPath('data.effective', $this->vaultRoot);
});

test('rejeita caminho relativo ou com traversal', function () {
    $this->patchJson('/api/settings/vault', ['vaults_path' => 'relativo/x'])->assertStatus(422);
    $this->patchJson('/api/settings/vault', ['vaults_path' => '/tmp/../etc'])->assertStatus(422);
});

test('exige autenticação', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/settings/vault')->assertUnauthorized();
    $this->patchJson('/api/settings/vault', [])->assertUnauthorized();
});
