<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\CaptureTool;
use App\Mcp\Tools\CompleteHabitTool;
use App\Mcp\Tools\CreateTaskTool;
use App\Mcp\Tools\MyDayTool;
use App\Mcp\Tools\MyStudiesTool;
use App\Mcp\Tools\ScheduleTool;
use App\Mcp\Tools\SearchNotesTool;
use Laravel\Mcp\Server;
use Laravel\Mcp\Server\Attributes\Instructions;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Attributes\Version;

#[Name('lifegui')]
#[Version('1.0.0')]
#[Instructions(<<<'TXT'
Assistente pessoal do usuário no lifegui: tarefas, hábitos, notas do segundo
cérebro (vault Obsidian) e agenda (Google Calendar). Horários sempre em
America/Sao_Paulo. Responda em português. Antes de criar eventos de
calendário (tool schedule), confirme data, hora e título com o usuário.
TXT)]
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
}
