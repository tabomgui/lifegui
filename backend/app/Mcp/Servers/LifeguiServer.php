<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\CaptureTool;
use App\Mcp\Tools\CompleteHabitTool;
use App\Mcp\Tools\CreateTaskTool;
use App\Mcp\Tools\MyDayTool;
use App\Mcp\Tools\MyStudiesTool;
use App\Mcp\Tools\ScheduleTool;
use App\Mcp\Tools\SearchNotesTool;
use Illuminate\Support\Facades\Auth;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;
use Laravel\Mcp\Server\ServerContext;

#[Name('lifegui')]
#[Version('2.0.0')]
class LifeguiServer extends Server
{
    protected array $tools = [
        MyDayTool::class,
        MyStudiesTool::class,
        SearchNotesTool::class,
        CaptureTool::class,
        CreateTaskTool::class,
        CompleteHabitTool::class,
        ScheduleTool::class,
    ];

    protected array $resources = [];

    protected array $prompts = [];

    /** Instruções no idioma e fuso do usuário (SetLocale já rodou na rota /mcp). */
    public function createContext(): ServerContext
    {
        $this->instructions = __('mcp.instructions', [
            'timezone' => Auth::user()?->timezone ?? config('app.timezone'),
        ]);

        return parent::createContext();
    }
}
