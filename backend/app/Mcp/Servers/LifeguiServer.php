<?php

namespace App\Mcp\Servers;

use App\Mcp\Tools\AgendarTool;
use App\Mcp\Tools\BuscarNotasTool;
use App\Mcp\Tools\CapturarTool;
use App\Mcp\Tools\ConcluirHabitoTool;
use App\Mcp\Tools\CriarTarefaTool;
use App\Mcp\Tools\MeuDiaTool;
use App\Mcp\Tools\MeusEstudosTool;
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
calendário (tool agendar), confirme data, hora e título com o usuário.
TXT)]
class LifeguiServer extends Server
{
    protected array $tools = [
        MeuDiaTool::class,
        MeusEstudosTool::class,
        BuscarNotasTool::class,
        CapturarTool::class,
        CriarTarefaTool::class,
        ConcluirHabitoTool::class,
        AgendarTool::class,
    ];

    protected array $resources = [];

    protected array $prompts = [];
}
