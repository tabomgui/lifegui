<?php

namespace App\Mcp\Tools;

use App\Models\Habit;
use App\Models\Task;
use App\Support\Calendar\CalendarNotConnectedException;
use App\Support\Calendar\CalendarService;
use App\Support\Vault\VaultService;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Illuminate\Support\Facades\Auth;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('meu_dia')]
#[Description('Resumo do dia do usuário: tarefas atrasadas e com prazo no dia, eventos da agenda (Google Calendar), hábitos ainda não feitos e capturas pendentes no inbox do segundo cérebro. Use para "o que tenho que fazer hoje" ou planejar o dia.')]
class MeuDiaTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private VaultService $vault,
        private CalendarService $calendar,
    ) {}

    public function handle(Request $request): Response
    {
        $dia = $request->get('data')
            ? CarbonImmutable::parse($request->get('data'), self::TZ)
            : CarbonImmutable::now(self::TZ);

        $out = ['# '.$dia->locale('pt_BR')->isoFormat('dddd, D [de] MMMM'), ''];

        // Tarefas
        $atrasadas = Task::where('status', '!=', 'done')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $dia->toDateString())
            ->orderBy('due_date')
            ->get();
        $doDia = Task::where('status', '!=', 'done')
            ->whereDate('due_date', $dia->toDateString())
            ->get();

        $out[] = '## Tarefas';
        if ($atrasadas->isEmpty() && $doDia->isEmpty()) {
            $out[] = 'Nenhuma tarefa com prazo pra hoje. Nada atrasado.';
        }
        foreach ($atrasadas as $t) {
            $out[] = "- [ATRASADA desde {$t->due_date->format('d/m')}] {$t->title}";
        }
        foreach ($doDia as $t) {
            $out[] = '- '.($t->is_priority ? '[prioridade] ' : '').$t->title;
        }
        $out[] = '';

        // Agenda
        $out[] = '## Agenda';
        try {
            $events = $this->calendar->events(Auth::user(), $dia->startOfDay(), $dia->endOfDay());
            if ($events === []) {
                $out[] = 'Nenhum evento no dia.';
            }
            foreach ($events as $e) {
                $start = $e['start'] ? CarbonImmutable::parse($e['start'])->setTimezone(self::TZ)->format('H:i') : '';
                $tag = $e['external'] ? '' : ' ('.($e['lifegui']['type'] ?? 'lifegui').')';
                $out[] = "- {$start} {$e['title']}{$tag}";
            }
        } catch (CalendarNotConnectedException) {
            $out[] = 'Google Calendar não conectado (Configurações do lifegui).';
        }
        $out[] = '';

        // Hábitos ainda não feitos no dia
        $pendentes = Habit::whereNull('archived_at')
            ->whereDoesntHave('logs', fn ($q) => $q->where('date', $dia->toDateString()))
            ->get();
        $out[] = '## Hábitos pendentes';
        $out[] = $pendentes->isEmpty()
            ? 'Todos os hábitos do dia já registrados.'
            : $pendentes->map(fn ($h) => "- {$h->name}")->implode("\n");
        $out[] = '';

        // Inbox
        $inbox = count($this->vault->listMarkdown('00-Inbox'));
        $out[] = '## Inbox do cérebro';
        $out[] = $inbox === 0 ? 'Inbox zerado.' : "{$inbox} captura(s) esperando processamento.";

        return Response::text(implode("\n", $out));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'data' => $schema->string()
                ->description('Dia desejado no formato Y-m-d. Omita para hoje.'),
        ];
    }
}
