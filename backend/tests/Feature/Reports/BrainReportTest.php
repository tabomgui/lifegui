<?php

use App\Models\User;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    $this->actingAs($this->user = User::factory()->create());
    File::ensureDirectoryExists(vaultPath().'/IA');
    File::ensureDirectoryExists(vaultPath().'/00-Inbox');
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('agrega status, semanas e inbox do vault', function () {
    makeNote('IA/Prompting.md', ['status' => 'estudando', 'data_salvo' => '2026-09-14']);
    makeNote('IA/Agentes.md', ['status' => 'concluido', 'data_salvo' => '2026-09-16']);
    makeNote('IA/Solta.md');
    makeNote('00-Inbox/link.md', ['status' => 'novo', 'data_salvo' => '2026-09-15']);

    $this->getJson('/api/reports/brain?from=2026-09-14&to=2026-09-20&tz=America/Sao_Paulo')
        ->assertOk()
        ->assertJsonPath('data.totals.notes', 3)
        ->assertJsonPath('data.totals.estudando', 1)
        ->assertJsonPath('data.totals.concluidas', 1)
        ->assertJsonPath('data.totals.inbox', 1)
        ->assertJsonPath('data.statuses.sem-status', 1)
        ->assertJsonPath('data.weekly.0.weekStart', '2026-09-14')
        ->assertJsonPath('data.weekly.0.created', 2)
        ->assertJsonPath('data.inboxWeekly.0.entered', 1);
});

test('vault não inicializado devolve zeros', function () {
    File::deleteDirectory(vaultPath());

    $this->getJson('/api/reports/brain?from=2026-09-14&to=2026-09-20')
        ->assertOk()
        ->assertJsonPath('data.totals.notes', 0)
        ->assertJsonPath('data.totals.inbox', 0);
});

test('updated conta o mtime dentro da janela', function () {
    makeNote('IA/Velha.md', ['status' => 'novo', 'data_salvo' => '2026-01-01']);

    // Arquivo acabou de ser gravado: mtime cai na janela que contém hoje.
    $today = now('UTC')->toDateString();

    $this->getJson("/api/reports/brain?from={$today}&to={$today}&tz=UTC")
        ->assertOk()
        ->assertJsonPath('data.weekly.0.created', 0)
        ->assertJsonPath('data.weekly.0.updated', 1);
});
