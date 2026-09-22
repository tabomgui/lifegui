<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->user = User::factory()->create();
    File::ensureDirectoryExists($this->vaultRoot.'/'.$this->user->id.'/00-Inbox');
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

function plainToken(): string
{
    $res = test()->actingAs(test()->user)->postJson('/api/tokens', ['name' => 'Atalho iPhone'])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Atalho iPhone');

    // Zera o estado de auth pra próxima request usar SÓ o bearer token.
    app('auth')->forgetGuards();

    return $res->json('data.token');
}

test('cria token, captura com bearer e o arquivo aparece no vault', function () {
    $token = plainToken();

    $this->postJson('/api/brain/inbox', [
        'content' => "https://ex.com/reel\nvisto no instagram\n",
        'title' => 'Reel de treino',
    ], ['Authorization' => "Bearer {$token}"])
        ->assertCreated()
        ->assertJsonPath('data.path', '00-Inbox/Reel de treino.md');

    expect(file_exists($this->vaultRoot.'/'.$this->user->id.'/00-Inbox/Reel de treino.md'))->toBeTrue();
});

test('token de captura não acessa nenhuma outra rota', function () {
    $token = plainToken();
    $headers = ['Authorization' => "Bearer {$token}"];

    $this->getJson('/api/brain/inbox', $headers)->assertForbidden();
    $this->getJson('/api/brain/categories', $headers)->assertForbidden();
    $this->getJson('/api/tasks', $headers)->assertForbidden();
    $this->getJson('/api/tokens', $headers)->assertForbidden();
    $this->postJson('/api/tokens', ['name' => 'x'], $headers)->assertForbidden();
});

test('sessão SPA continua acessando tudo normalmente', function () {
    $this->actingAs($this->user);

    $this->getJson('/api/brain/categories')->assertOk();
    $this->getJson('/api/tokens')->assertOk();
});

test('lista e revoga tokens; revogado deixa de funcionar', function () {
    $token = plainToken();

    $this->actingAs($this->user);
    $list = $this->getJson('/api/tokens')->assertOk()->assertJsonCount(1, 'data');
    $id = $list->json('data.0.id');

    $this->deleteJson("/api/tokens/{$id}")->assertNoContent();
    $this->getJson('/api/tokens')->assertOk()->assertJsonCount(0, 'data');

    $this->app['auth']->forgetGuards();
    $this->postJson('/api/brain/inbox', ['content' => 'x'], ['Authorization' => "Bearer {$token}"])
        ->assertUnauthorized();
});

test('não revoga token de outro usuário', function () {
    plainToken();
    $other = User::factory()->create();
    $this->actingAs($other);

    $mine = User::query()->find($this->user->id)->tokens()->first();
    $this->deleteJson("/api/tokens/{$mine->id}")->assertNotFound();
});
