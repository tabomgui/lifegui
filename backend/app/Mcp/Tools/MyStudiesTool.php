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

#[Name('my_studies')]
#[Description('Overview of studies: second-brain notes by status and category (with titles of what is being studied and what needs review), progress of the Study habit this week, and upcoming scheduled study blocks. Use for "how are my studies going".')]
class MyStudiesTool extends Tool
{
    private const TZ = 'America/Sao_Paulo';

    public function __construct(
        private VaultService $vault,
        private CalendarService $calendar,
    ) {}

    public function handle(Request $request): Response
    {
        $out = [__('mcp.my_studies.heading'), ''];

        // Notas por categoria/status
        $estudando = [];
        $aRevisar = [];
        $out[] = __('mcp.my_studies.notes_heading');
        foreach ($this->vault->categories() as $categoria) {
            $porStatus = [];
            foreach ($this->vault->listMarkdown($categoria) as $path) {
                $note = $this->vault->read($path);
                $status = $note['frontmatter']['status'] ?? __('mcp.my_studies.no_status_label');
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
            $out[] = __('mcp.my_studies.studying_label').implode('; ', $estudando);
        }
        if ($aRevisar !== []) {
            $out[] = __('mcp.my_studies.to_review_label').implode('; ', $aRevisar);
        }
        $out[] = '';

        // Hábito de estudo: qualquer nome em mcp.study_habit_names (pt-BR: "Estudar", en: "Study").
        $nomesEstudo = array_map('mb_strtolower', __('mcp.study_habit_names'));
        $habit = Habit::whereNull('archived_at')
            ->get()
            ->first(fn ($h) => in_array(mb_strtolower($h->name), $nomesEstudo, true));
        $out[] = __('mcp.my_studies.habit_heading');
        if ($habit === null) {
            $out[] = __('mcp.my_studies.habit_not_found');
        } else {
            $hoje = CarbonImmutable::now(self::TZ);
            $semana = $habit->logs()
                ->whereBetween('date', [$hoje->startOfWeek()->toDateString(), $hoje->endOfWeek()->toDateString()])
                ->where('done', true)
                ->count();
            $out[] = $habit->target_per_week
                ? __('mcp.my_studies.progress_with_target', ['n' => $semana, 'target' => $habit->target_per_week])
                : __('mcp.my_studies.progress', ['n' => $semana]);

            // Sequência: dias consecutivos com registro, contando de ontem/hoje pra trás.
            $dates = $habit->logs()->where('done', true)->orderByDesc('date')->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->all();
            $streak = 0;
            $cursor = in_array($hoje->toDateString(), $dates, true) ? $hoje : $hoje->subDay();
            while (in_array($cursor->toDateString(), $dates, true)) {
                $streak++;
                $cursor = $cursor->subDay();
            }
            $out[] = __('mcp.my_studies.streak', ['n' => $streak]);
        }
        $out[] = '';

        // Próximos blocos agendados
        $out[] = __('mcp.my_studies.upcoming_heading');
        try {
            $eventos = $habit !== null
                ? $this->calendar->linked(Auth::user(), 'habit', (string) $habit->id)
                : [];
            if ($eventos === []) {
                $out[] = __('mcp.my_studies.no_upcoming');
            }
            foreach ($eventos as $e) {
                $inicio = $e['start'] ? CarbonImmutable::parse($e['start'])->setTimezone(self::TZ)->format('H:i') : '';
                $rec = collect($e['recurrence'] ?? [])->first(fn ($r) => str_starts_with($r, 'RRULE:'));
                $dias = $rec && preg_match('/BYDAY=([^;]+)/', $rec, $m) ? __('mcp.my_studies.weekly_suffix', ['day' => $m[1]]) : '';
                $out[] = __('mcp.my_studies.event_item', ['title' => $e['title'], 'time' => $inicio, 'days' => $dias]);
            }
        } catch (CalendarNotConnectedException) {
            $out[] = __('mcp.my_studies.calendar_not_connected');
        }

        return Response::text(implode("\n", $out));
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
