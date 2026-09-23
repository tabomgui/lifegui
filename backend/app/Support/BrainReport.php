<?php

namespace App\Support;

use App\Support\Vault\VaultService;
use Illuminate\Support\Carbon;

/**
 * Agregações do vault pro dashboard do Cérebro (espelha TaskReport/HabitReport).
 *
 * O vault não tem histórico transacional: "criada" vem do frontmatter
 * data_salvo e "atualizada" do mtime do arquivo (última gravação vence).
 */
class BrainReport
{
    /**
     * @return array<string, mixed>
     */
    public static function build(string $fromDate, string $toDate, string $tz, VaultService $vault): array
    {
        $from = Carbon::createFromFormat('Y-m-d', $fromDate)->startOfDay();
        $to = Carbon::createFromFormat('Y-m-d', $toDate)->startOfDay();

        $statuses = ['novo' => 0, 'estudando' => 0, 'concluido' => 0, 'a-revisar' => 0, 'sem-status' => 0];
        $createdByDay = [];
        $updatedByDay = [];
        $totalNotes = 0;

        if ($vault->initialized()) {
            foreach ($vault->categories() as $category) {
                foreach ($vault->listMarkdown($category) as $path) {
                    $totalNotes++;
                    $note = $vault->read($path);
                    $fm = $note['frontmatter'] ?? [];

                    $status = is_string($fm['status'] ?? null) ? $fm['status'] : null;
                    if ($status !== null && array_key_exists($status, $statuses)) {
                        $statuses[$status]++;
                    } else {
                        $statuses['sem-status']++;
                    }

                    $created = self::dateOf($fm['data_salvo'] ?? null);
                    if ($created !== null) {
                        $createdByDay[$created] = ($createdByDay[$created] ?? 0) + 1;
                    }

                    $absolute = $vault->resolve($path);
                    if ($absolute !== null) {
                        $updated = Carbon::createFromTimestamp((int) filemtime($absolute), 'UTC')
                            ->setTimezone($tz)->toDateString();
                        $updatedByDay[$updated] = ($updatedByDay[$updated] ?? 0) + 1;
                    }
                }
            }
        }

        // Inbox: saldo atual + entradas pendentes agrupadas por semana do
        // data_salvo (idade do backlog; não há histórico de saldo).
        $inboxPending = 0;
        $inboxByDay = [];
        if ($vault->initialized()) {
            foreach ($vault->listMarkdown('00-Inbox') as $path) {
                $inboxPending++;
                $entered = self::dateOf($vault->read($path)['frontmatter']['data_salvo'] ?? null);
                if ($entered !== null) {
                    $inboxByDay[$entered] = ($inboxByDay[$entered] ?? 0) + 1;
                }
            }
        }

        $weekly = [];
        $inboxWeekly = [];
        $weekStart = $from->copy()->startOfWeek(Carbon::MONDAY);
        while ($weekStart->lte($to)) {
            $created = 0;
            $updated = 0;
            $entered = 0;
            for ($i = 0; $i < 7; $i++) {
                $d = $weekStart->copy()->addDays($i)->toDateString();
                $created += $createdByDay[$d] ?? 0;
                $updated += $updatedByDay[$d] ?? 0;
                $entered += $inboxByDay[$d] ?? 0;
            }
            $weekly[] = ['weekStart' => $weekStart->toDateString(), 'created' => $created, 'updated' => $updated];
            $inboxWeekly[] = ['weekStart' => $weekStart->toDateString(), 'entered' => $entered];
            $weekStart->addWeek();
        }

        return [
            'totals' => [
                'notes' => $totalNotes,
                'estudando' => $statuses['estudando'],
                'concluidas' => $statuses['concluido'],
                'inbox' => $inboxPending,
            ],
            'statuses' => $statuses,
            'weekly' => $weekly,
            'inboxWeekly' => $inboxWeekly,
        ];
    }

    private static function dateOf(mixed $value): ?string
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        // Symfony Yaml converte datas ISO sem aspas em timestamp Unix.
        if (is_int($value)) {
            return Carbon::createFromTimestamp($value, 'UTC')->toDateString();
        }
        if (is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}/', $value) === 1) {
            return substr($value, 0, 10);
        }

        return null;
    }
}
