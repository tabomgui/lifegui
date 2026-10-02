<?php

use App\Mcp\Servers\LifeguiServer;
use App\Mcp\Tools\CaptureTool;
use App\Mcp\Tools\CompleteHabitTool;
use App\Mcp\Tools\CreateTaskTool;
use App\Mcp\Tools\MyDayTool;
use App\Mcp\Tools\MyStudiesTool;
use App\Mcp\Tools\ScheduleTool;
use App\Mcp\Tools\SearchNotesTool;
use App\Models\Category;
use App\Models\Habit;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    app()->setLocale('pt_BR');
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
    Carbon::setTestNow();
});

test('servidor expõe as tools com nomes em inglês', function () {
    $names = collect((new ReflectionClass(LifeguiServer::class))->getDefaultProperties()['tools'])
        ->map(fn ($class) => app($class)->name())
        ->sort()->values()->all();

    expect($names)->toBe(['capture', 'complete_habit', 'create_task', 'my_day', 'my_studies', 'schedule', 'search_notes']);
});

test('my_day resume tarefas, agenda, hábitos e inbox', function () {
    Task::factory()->for($this->user)->create(['title' => 'Pagar boleto', 'status' => 'todo', 'due_date' => now('America/Sao_Paulo')->subDay()]);
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);
    makeNote('00-Inbox/captura-x.md', ['status' => 'novo'], "https://exemplo.com\n");

    LifeguiServer::actingAs($this->user)->tool(MyDayTool::class)
        ->assertOk()
        ->assertSee('ATRASADA')
        ->assertSee('Pagar boleto')
        ->assertSee('Leitura')
        ->assertSee('1 captura esperando');
});

test('my_day avisa quando Google Calendar não está conectado', function () {
    $this->user->forceFill(['google_calendar_refresh_token' => null])->save();

    LifeguiServer::actingAs($this->user)->tool(MyDayTool::class)
        ->assertOk()
        ->assertSee('não conectado');
});

test('my_studies mostra notas por status e hábito Estudar', function () {
    $habit = Habit::factory()->for($this->user)->create(['name' => 'Estudar', 'target_per_week' => 4]);
    $habit->logs()->create(['date' => now('America/Sao_Paulo')->format('Y-m-d'), 'done' => true, 'skipped' => false]);

    LifeguiServer::actingAs($this->user)->tool(MyStudiesTool::class)
        ->assertOk()
        ->assertSee('RAG')
        ->assertSee('estudando: 1')
        ->assertSee('Feito 1x nesta semana de 4')
        ->assertSee('Sequência atual: 1');
});

test('my_studies conta a semana de segunda a domingo mesmo com locale pt-BR', function () {
    // app()->setLocale('pt_BR') (beforeEach) propaga pra Carbon::setLocale() via o
    // listener de LocaleUpdated do nesbot/carbon — e pro locale pt_BR, a semana do
    // Carbon começa no domingo. Sem fixar MONDAY/SUNDAY explicitamente, a consulta
    // semanal do hábito ficaria errada sempre que "hoje" for domingo.
    Carbon::setTestNow(Carbon::parse('2026-10-04 12:00:00', 'America/Sao_Paulo')); // domingo

    $habit = Habit::factory()->for($this->user)->create(['name' => 'Estudar', 'target_per_week' => 4]);
    // Segunda-feira da mesma semana ISO (segunda a domingo) que contém o domingo acima.
    $habit->logs()->create(['date' => '2026-09-28', 'done' => true, 'skipped' => false]);

    LifeguiServer::actingAs($this->user)->tool(MyStudiesTool::class)
        ->assertOk()
        ->assertSee('Feito 1x nesta semana de 4');
});

test('search_notes acha por conteúdo e lê nota inteira por caminho', function () {
    LifeguiServer::actingAs($this->user)->tool(SearchNotesTool::class, ['query' => 'busca e geração'])
        ->assertOk()
        ->assertSee('RAG')
        ->assertSee('IA/RAG.md');

    LifeguiServer::actingAs($this->user)->tool(SearchNotesTool::class, ['path' => 'IA/RAG.md'])
        ->assertOk()
        ->assertSee('Retrieval augmented generation');
});

test('search_notes sem args retorna erro claro', function () {
    LifeguiServer::actingAs($this->user)->tool(SearchNotesTool::class)
        ->assertHasErrors();
});

test('capture cria arquivo no inbox', function () {
    LifeguiServer::actingAs($this->user)->tool(CaptureTool::class, [
        'content' => 'https://exemplo.com/artigo',
        'title' => 'Artigo legal',
    ])->assertOk()->assertSee('Artigo legal');

    expect(file_exists(vaultPath().'/00-Inbox/Artigo legal.md'))->toBeTrue();
});

test('create_task com categoria pelo nome', function () {
    Category::factory()->for($this->user)->create(['name' => 'Casa']);

    LifeguiServer::actingAs($this->user)->tool(CreateTaskTool::class, [
        'title' => 'Trocar lâmpada',
        'category' => 'casa',
        'due' => '2026-09-30',
    ])->assertOk()->assertSee('Trocar lâmpada');

    $task = Task::withoutGlobalScopes()->where('title', 'Trocar lâmpada')->first();
    expect($task->user_id)->toBe($this->user->id)
        ->and($task->due_date->format('Y-m-d'))->toBe('2026-09-30');
});

test('create_task com categoria inexistente erra com lista', function () {
    Category::factory()->for($this->user)->create(['name' => 'Casa']);

    LifeguiServer::actingAs($this->user)->tool(CreateTaskTool::class, [
        'title' => 'X', 'category' => 'Trabalho',
    ])->assertHasErrors()->assertSee('Casa');
});

test('complete_habit marca hoje e não desfaz se repetido', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);

    LifeguiServer::actingAs($this->user)->tool(CompleteHabitTool::class, ['name' => 'leitura'])
        ->assertOk()->assertSee('Sequência atual: 1');

    LifeguiServer::actingAs($this->user)->tool(CompleteHabitTool::class, ['name' => 'Leitura'])
        ->assertOk()->assertSee('já estava marcado');

    expect(Habit::first()->logs()->count())->toBe(1);
});

test('complete_habit com nome errado lista os ativos', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Leitura']);

    LifeguiServer::actingAs($this->user)->tool(CompleteHabitTool::class, ['name' => 'Corrida'])
        ->assertHasErrors()->assertSee('Leitura');
});

test('schedule cria evento recorrente vinculado a hábito', function () {
    $habit = Habit::factory()->for($this->user)->create(['name' => 'Estudar']);

    LifeguiServer::actingAs($this->user)->tool(ScheduleTool::class, [
        'title' => 'Estudar IA',
        'start' => '2026-09-28T19:30:00',
        'type' => 'habit',
        'ref' => (string) $habit->id,
        'repeat_days' => ['MO', 'WE'],
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

test('schedule sem Calendar conectado erra com instrução', function () {
    $this->user->forceFill(['google_calendar_refresh_token' => null])->save();

    LifeguiServer::actingAs($this->user)->tool(ScheduleTool::class, [
        'title' => 'X', 'start' => '2026-09-28T19:30:00',
    ])->assertHasErrors()->assertSee('não conectado');
});

test('schedule recusa ref de outro usuário', function () {
    $other = User::factory()->create();
    $task = Task::factory()->for($other)->create();

    LifeguiServer::actingAs($this->user)->tool(ScheduleTool::class, [
        'title' => 'X', 'start' => '2026-09-28T19:30:00', 'type' => 'task', 'ref' => (string) $task->id,
    ])->assertHasErrors();
});
