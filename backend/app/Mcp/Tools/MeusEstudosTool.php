<?php

namespace App\Mcp\Tools;

use App\Models\Habit;
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

#[Name('meus_estudos')]
#[Description('Panorama dos estudos: notas do segundo cérebro por status e categoria (com títulos do que está em estudo e a revisar), progresso do hábito Estudar na semana e próximos blocos de estudo agendados. Use para "como estão meus estudos".')]
class MeusEstudosTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private VaultService $vault,
        private CalendarService $calendar,
    ) {}

    public function handle(Request $request): Response
    {
        $out = ['# Seus estudos', ''];

        // Notas por categoria/status
        $estudando = [];
        $aRevisar = [];
        $out[] = '## Notas';
        foreach ($this->vault->categories() as $categoria) {
            $porStatus = [];
            foreach ($this->vault->listMarkdown($categoria) as $path) {
                $note = $this->vault->read($path);
                $status = $note['frontmatter']['status'] ?? 'sem-status';
                $porStatus[$status] = ($porStatus[$status] ?? 0) + 1;
                $titulo = basename($path, '.md');
                if ($status === 'estudando') {
                    $estudando[] = "{$titulo} ({$categoria})";
                }
                if ($status === 'a-revisar') {
                    $aRevisar[] = "{$titulo} ({$categoria})";
                }
            }
            if ($porStatus !== []) {
                ksort($porStatus);
                $resumo = collect($porStatus)->map(fn ($n, $s) => "{$s}: {$n}")->implode(', ');
                $out[] = "- {$categoria}: {$resumo}";
            }
        }
        if ($estudando !== []) {
            $out[] = '';
            $out[] = '**Estudando agora:** '.implode('; ', $estudando);
        }
        if ($aRevisar !== []) {
            $out[] = '**A revisar:** '.implode('; ', $aRevisar);
        }
        $out[] = '';

        // Hábito Estudar
        $habit = Habit::whereNull('archived_at')->whereRaw('LOWER(name) = ?', ['estudar'])->first();
        $out[] = '## Hábito Estudar';
        if ($habit === null) {
            $out[] = 'Nenhum hábito chamado "Estudar" ativo.';
        } else {
            $hoje = CarbonImmutable::now(self::TZ);
            $semana = $habit->logs()
                ->whereBetween('date', [$hoje->startOfWeek()->toDateString(), $hoje->endOfWeek()->toDateString()])
                ->where('done', true)
                ->count();
            $meta = $habit->target_per_week ? " de {$habit->target_per_week} (meta)" : '';
            $out[] = "Feito {$semana}x nesta semana{$meta}.";

            // Sequência: dias consecutivos com registro, contando de ontem/hoje pra trás.
            $dates = $habit->logs()->where('done', true)->orderByDesc('date')->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->all();
            $streak = 0;
            $cursor = in_array($hoje->toDateString(), $dates, true) ? $hoje : $hoje->subDay();
            while (in_array($cursor->toDateString(), $dates, true)) {
                $streak++;
                $cursor = $cursor->subDay();
            }
            $out[] = "Sequência atual: {$streak} dia(s).";
        }
        $out[] = '';

        // Próximos blocos agendados
        $out[] = '## Próximos blocos na agenda';
        try {
            $eventos = $habit !== null
                ? $this->calendar->linked(Auth::user(), 'habit', (string) $habit->id)
                : [];
            if ($eventos === []) {
                $out[] = 'Nenhum bloco de estudo agendado.';
            }
            foreach ($eventos as $e) {
                $inicio = $e['start'] ? CarbonImmutable::parse($e['start'])->setTimezone(self::TZ)->format('H:i') : '';
                $rec = collect($e['recurrence'] ?? [])->first(fn ($r) => str_starts_with($r, 'RRULE:'));
                $dias = $rec && preg_match('/BYDAY=([^;]+)/', $rec, $m) ? " (toda {$m[1]})" : '';
                $out[] = "- {$e['title']} às {$inicio}{$dias}";
            }
        } catch (CalendarNotConnectedException) {
            $out[] = 'Google Calendar não conectado.';
        }

        return Response::text(implode("\n", $out));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
