<?php

namespace App\Mcp\Tools;

use App\Models\Habit;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\JsonSchema\Types\Type;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Attributes\Description;
use Laravel\Mcp\Server\Attributes\Name;
use Laravel\Mcp\Server\Tool;

#[Name('concluir_habito')]
#[Description('Marca um hábito como feito hoje, pelo nome. Nunca desfaz: se já estava feito, apenas informa.')]
class ConcluirHabitoTool extends Tool
{
    public function handle(Request $request): Response
    {
        $request->validate(['nome' => ['required', 'string']]);

        $habit = Habit::whereNull('archived_at')
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($request->get('nome'))])
            ->first();

        if ($habit === null) {
            $nomes = Habit::whereNull('archived_at')->pluck('name')->implode(', ');

            return Response::error("Hábito \"{$request->get('nome')}\" não encontrado. Ativos: {$nomes}.");
        }

        $hoje = CarbonImmutable::now('America/Sao_Paulo')->toDateString();
        $log = $habit->logs()->where('date', $hoje)->first();

        if ($log !== null && $log->done) {
            return Response::text("\"{$habit->name}\" já estava marcado como feito hoje.");
        }

        if ($log !== null) {
            $log->update(['done' => true, 'skipped' => false]);
        } else {
            $habit->logs()->create(['date' => $hoje, 'done' => true, 'skipped' => false]);
        }

        // Sequência: dias consecutivos com registro feito, terminando hoje.
        $dates = $habit->logs()->where('done', true)->orderByDesc('date')->pluck('date')->map(fn ($d) => $d->format('Y-m-d'))->all();
        $streak = 0;
        $cursor = CarbonImmutable::parse($hoje);
        while (in_array($cursor->toDateString(), $dates, true)) {
            $streak++;
            $cursor = $cursor->subDay();
        }

        return Response::text("\"{$habit->name}\" marcado como feito hoje. Sequência atual: {$streak} dia(s).");
    }

    /** @return array<string, Type> */
    public function schema(JsonSchema $schema): array
    {
        return [
            'nome' => $schema->string()->description('Nome do hábito (ex.: Leitura, Exercício).')->required(),
        ];
    }
}
