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

#[Name('agendar')]
#[Description('Cria um evento no Google Calendar do usuário (calendário principal): avulso ou vinculado a tarefa/hábito/nota. IMPORTANTE: confirme título, data e hora com o usuário antes de chamar. Recorrência semanal via recorrencia_dias.')]
class AgendarTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private CalendarService $calendar,
        private VaultService $vault,
    ) {}

    public function handle(Request $request): Response
    {
        $request->validate([
            'titulo' => ['required', 'string', 'max:255'],
            'inicio' => ['required', 'date'],
            'duracao_minutos' => ['nullable', 'integer', 'min:5', 'max:1440'],
            'tipo' => ['nullable', 'in:event,task,habit,note'],
            'ref' => ['nullable', 'string', 'max:500'],
            'recorrencia_dias' => ['nullable', 'array'],
            'recorrencia_dias.*' => ['in:MO,TU,WE,TH,FR,SA,SU'],
        ]);

        $tipo = $request->get('tipo') ?? 'event';
        $ref = (string) ($request->get('ref') ?? '');

        if ($tipo !== 'event') {
            if ($ref === '') {
                return Response::error("Tipo {$tipo} exige \"ref\" (id da tarefa/hábito ou caminho da nota).");
            }
            $owned = match ($tipo) {
                'task' => Task::whereKey($ref)->exists(),
                'habit' => Habit::whereKey($ref)->exists(),
                'note' => $this->vault->read($ref) !== null,
            };
            if (! $owned) {
                return Response::error("Item não encontrado: {$tipo} {$ref}.");
            }
        }

        $inicio = CarbonImmutable::parse($request->get('inicio'), self::TZ);
        $fim = $inicio->addMinutes($request->get('duracao_minutos') ?? 60);
        $dias = $request->get('recorrencia_dias') ?? [];

        try {
            $event = $this->calendar->create(Auth::user(), [
                'title' => $request->get('titulo'),
                'description' => 'Criado pelo lifegui (assistente) · '.config('app.frontend_url').'/agenda',
                'start' => $inicio->toRfc3339String(),
                'end' => $fim->toRfc3339String(),
                'timezone' => self::TZ,
                'rrule' => $dias !== [] ? 'RRULE:FREQ=WEEKLY;BYDAY='.implode(',', $dias) : null,
                'type' => $tipo,
                'ref' => $ref,
            ]);
        } catch (CalendarNotConnectedException) {
            return Response::error('Google Calendar não conectado. Conecte em Configurações no lifegui.');
        }

        $quando = $inicio->locale('pt_BR')->isoFormat('ddd D/MM HH:mm');
        $rec = $dias !== [] ? ' (semanal: '.implode(', ', $dias).')' : '';

        return Response::text("Evento criado: \"{$event['title']}\" em {$quando}{$rec}.");
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'titulo' => $schema->string()->description('Título do evento.')->required(),
            'inicio' => $schema->string()->description('Início ISO (ex.: 2026-09-25T19:00:00). Interpretado em America/Sao_Paulo se sem offset.')->required(),
            'duracao_minutos' => $schema->integer()->description('Duração em minutos (padrão 60).'),
            'tipo' => $schema->string()->enum(['event', 'task', 'habit', 'note'])->description('event = avulso (padrão); task/habit/note vincula a um item.'),
            'ref' => $schema->string()->description('Id da tarefa/hábito ou caminho da nota, quando tipo não é event.'),
            'recorrencia_dias' => $schema->array()->description('Dias da semana pra repetir toda semana: MO,TU,WE,TH,FR,SA,SU.'),
        ];
    }
}
