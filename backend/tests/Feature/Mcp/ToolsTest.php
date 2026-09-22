<?php

use App\Mcp\Servers\LifeguiServer;
use App\Mcp\Tools\AgendarTool;
use App\Mcp\Tools\BuscarNotasTool;
use App\Mcp\Tools\CapturarTool;
use App\Mcp\Tools\ConcluirHabitoTool;
use App\Mcp\Tools\CriarTarefaTool;
use App\Mcp\Tools\MeuDiaTool;
use App\Mcp\Tools\MeusEstudosTool;
use App\Models\Category;
use App\Models\Habit;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    $this->user = User::factory()->create(['google_calendar_refresh_token' => 'rt-abc']);
    $this->actingAs($this->user);

    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    File::ensureDirectoryExists(vaultPath().'/00-Inbox/processados');
    File::ensureDirectoryExists(vaultPath().'/IA');
    makeNote('IA/RAG.md', ['status' => 'estudando'], "Retrieval augmented generation combina busca e geração.\n");
    makeNote('IA/Prompting.md', ['status' => 'a-revisar'], "Técnicas de prompt.\n");

    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'at-123']),
        // GET lista vazia; POST ecoa o evento criado (id fake).
        'www.googleapis.com/calendar/v3/*' => function ($request) {
            if ($request->method() !== 'POST') {
                return Http::response(['items' => []]);
            }
            $body = $request->data();

            return Http::response(array_merge(['id' => 'ev-fake'], $body));
        },
    ]);
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('meu_dia resume tarefas, agenda, hábitos e inbox', function () {
    Task::factory()->for($this->user)->create(['title' => 'Pagar boleto', 'status' => 'todo', 'due_date' => now()->subDay()]);
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);
    makeNote('00-Inbox/captura-x.md', ['status' => 'novo'], "https://exemplo.com\n");

    LifeguiServer::actingAs($this->user)->tool(MeuDiaTool::class)
        ->assertOk()
        ->assertSee('ATRASADA')
        ->assertSee('Pagar boleto')
        ->assertSee('Leitura')
        ->assertSee('1 captura(s)');
});

test('meu_dia avisa quando Google Calendar não está conectado', function () {
    $this->user->forceFill(['google_calendar_refresh_token' => null])->save();

    LifeguiServer::actingAs($this->user)->tool(MeuDiaTool::class)
        ->assertOk()
        ->assertSee('não conectado');
});

test('meus_estudos mostra notas por status e hábito Estudar', function () {
    $habit = Habit::factory()->for($this->user)->create(['name' => 'Estudar', 'target_per_week' => 4]);
    $habit->logs()->create(['date' => now()->format('Y-m-d'), 'done' => true, 'skipped' => false]);

    LifeguiServer::actingAs($this->user)->tool(MeusEstudosTool::class)
        ->assertOk()
        ->assertSee('RAG')
        ->assertSee('estudando: 1')
        ->assertSee('Feito 1x nesta semana de 4')
        ->assertSee('Sequência atual: 1');
});

test('buscar_notas acha por conteúdo e lê nota inteira por caminho', function () {
    LifeguiServer::actingAs($this->user)->tool(BuscarNotasTool::class, ['busca' => 'busca e geração'])
        ->assertOk()
        ->assertSee('RAG')
        ->assertSee('IA/RAG.md');

    LifeguiServer::actingAs($this->user)->tool(BuscarNotasTool::class, ['caminho' => 'IA/RAG.md'])
        ->assertOk()
        ->assertSee('Retrieval augmented generation');
});

test('buscar_notas sem args retorna erro claro', function () {
    LifeguiServer::actingAs($this->user)->tool(BuscarNotasTool::class)
        ->assertHasErrors();
});

test('capturar cria arquivo no inbox', function () {
    LifeguiServer::actingAs($this->user)->tool(CapturarTool::class, [
        'conteudo' => 'https://exemplo.com/artigo',
        'titulo' => 'Artigo legal',
    ])->assertOk()->assertSee('Artigo legal');

    expect(file_exists(vaultPath().'/00-Inbox/Artigo legal.md'))->toBeTrue();
});

test('criar_tarefa com categoria pelo nome', function () {
    Category::factory()->for($this->user)->create(['name' => 'Casa']);

    LifeguiServer::actingAs($this->user)->tool(CriarTarefaTool::class, [
        'titulo' => 'Trocar lâmpada',
        'categoria' => 'casa',
        'prazo' => '2026-09-30',
    ])->assertOk()->assertSee('Trocar lâmpada');

    $task = Task::withoutGlobalScopes()->where('title', 'Trocar lâmpada')->first();
    expect($task->user_id)->toBe($this->user->id)
        ->and($task->due_date->format('Y-m-d'))->toBe('2026-09-30');
});

test('criar_tarefa com categoria inexistente erra com lista', function () {
    Category::factory()->for($this->user)->create(['name' => 'Casa']);

    LifeguiServer::actingAs($this->user)->tool(CriarTarefaTool::class, [
        'titulo' => 'X', 'categoria' => 'Trabalho',
    ])->assertHasErrors()->assertSee('Casa');
});

test('concluir_habito marca hoje e não desfaz se repetido', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);

    LifeguiServer::actingAs($this->user)->tool(ConcluirHabitoTool::class, ['nome' => 'leitura'])
        ->assertOk()->assertSee('Sequência atual: 1');

    LifeguiServer::actingAs($this->user)->tool(ConcluirHabitoTool::class, ['nome' => 'Leitura'])
        ->assertOk()->assertSee('já estava marcado');

    expect(Habit::first()->logs()->count())->toBe(1);
});

test('concluir_habito com nome errado lista os ativos', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);

    LifeguiServer::actingAs($this->user)->tool(ConcluirHabitoTool::class, ['nome' => 'Corrida'])
        ->assertHasErrors()->assertSee('Leitura');
});

test('agendar cria evento recorrente vinculado a hábito', function () {
    $habit = Habit::factory()->for($this->user)->create(['name' => 'Estudar']);

    LifeguiServer::actingAs($this->user)->tool(AgendarTool::class, [
        'titulo' => 'Estudar IA',
        'inicio' => '2026-09-28T19:30:00',
        'tipo' => 'habit',
        'ref' => (string) $habit->id,
        'recorrencia_dias' => ['MO', 'WE'],
    ])->assertOk()->assertSee('Evento criado');

    Http::assertSent(function ($request) {
        if ($request->method() !== 'POST' || ! str_contains($request->url(), 'calendars/primary/events')) {
            return false;
        }
        $body = $request->data();

        return $body['recurrence'] === ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE']
            && $body['extendedProperties']['private']['lifegui_type'] === 'habit';
    });
});

test('agendar sem Calendar conectado erra com instrução', function () {
    $this->user->forceFill(['google_calendar_refresh_token' => null])->save();

    LifeguiServer::actingAs($this->user)->tool(AgendarTool::class, [
        'titulo' => 'X', 'inicio' => '2026-09-28T19:30:00',
    ])->assertHasErrors()->assertSee('não conectado');
});

test('agendar recusa ref de outro usuário', function () {
    $other = User::factory()->create();
    $task = Task::factory()->for($other)->create();

    LifeguiServer::actingAs($this->user)->tool(AgendarTool::class, [
        'titulo' => 'X', 'inicio' => '2026-09-28T19:30:00', 'tipo' => 'task', 'ref' => (string) $task->id,
    ])->assertHasErrors();
});
