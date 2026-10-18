<?php

use App\Mcp\Servers\LifeguiServer;
use App\Mcp\Tools\CompleteHabitTool;
use App\Mcp\Tools\MyDayTool;
use App\Mcp\Tools\MyStudiesTool;
use App\Models\Habit;
use App\Models\Task;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    Cache::flush();
    // LifeguiServer::actingAs()->tool() não roda o middleware HTTP (SetLocale),
    // então setamos o locale manualmente, como o usuário teria configurado.
    app()->setLocale('en');
    $this->user = User::factory()->create(['google_calendar_refresh_token' => 'rt-abc', 'locale' => 'en']);
    $this->actingAs($this->user);

    $this->vaultRoot = sys_get_temp_dir().'/lifegui-vault-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
    File::ensureDirectoryExists(vaultPath().'/00-Inbox/processados');
    File::ensureDirectoryExists(vaultPath().'/IA');

    Http::fake([
        'oauth2.googleapis.com/*' => Http::response(['access_token' => 'at-123']),
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

test('complete_habit responde em inglês', function () {
    Habit::factory()->for($this->user)->create(['name' => 'Reading']);

    LifeguiServer::actingAs($this->user)->tool(CompleteHabitTool::class, ['name' => 'reading'])
        ->assertOk()
        ->assertSee('marked as done today')
        ->assertSee('Current streak: 1 day.');
});

test('my_day responde em inglês', function () {
    Task::factory()->for($this->user)->create([
        'title' => 'Pay bill',
        'status' => 'todo',
        'due_date' => CarbonImmutable::now('America/Sao_Paulo')->subDay(),
    ]);

    LifeguiServer::actingAs($this->user)->tool(MyDayTool::class)
        ->assertOk()
        ->assertSee('OVERDUE')
        ->assertSee('Pay bill');
});

test('my_studies reconhece o hábito Study em inglês', function () {
    $habit = Habit::factory()->for($this->user)->create(['name' => 'Study', 'target_per_week' => 4]);
    $habit->logs()->create(['date' => CarbonImmutable::now('America/Sao_Paulo')->format('Y-m-d'), 'done' => true, 'skipped' => false]);

    LifeguiServer::actingAs($this->user)->tool(MyStudiesTool::class)
        ->assertOk()
        ->assertSee('Done 1x this week out of 4');
});

test('instruções do servidor seguem o idioma', function () {
    $server = (new ReflectionClass(LifeguiServer::class))->newInstanceWithoutConstructor();

    app()->setLocale('en');
    expect($server->createContext()->instructions)->toContain('Answer in English');

    app()->setLocale('pt_BR');
    expect($server->createContext()->instructions)->toContain('Responda em português');
});
