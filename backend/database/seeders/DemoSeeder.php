<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\Subtask;
use App\Models\Task;
use App\Models\User;
use App\Models\UserModule;
use App\Support\Vault\VaultService;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;

/**
 * Dados de demonstração (usuário demo@lifegui.test) para screenshots e
 * avaliação local. Fora do DatabaseSeeder: roda só com --class=DemoSeeder.
 * Idempotente: recria o usuário demo do zero a cada execução.
 */
class DemoSeeder extends Seeder
{
    public const EMAIL = 'demo@lifegui.test';

    public const PASSWORD = 'demo1234';

    public function run(VaultService $vault): void
    {
        $this->removeExisting($vault);

        $user = User::create([
            'name' => 'Alex Demo',
            'email' => self::EMAIL,
            'password' => Hash::make(self::PASSWORD),
        ]);
        $user->forceFill(['onboarded_at' => now()])->save();

        // Global scope, user_id automático e raiz do vault dependem do usuário autenticado.
        Auth::setUser($user);
        mt_srand(42);

        foreach (['tasks', 'habits', 'brain'] as $key) {
            UserModule::create(['key' => $key, 'enabled' => true]);
        }

        $today = CarbonImmutable::today();
        $this->seedTasks($today);
        $this->seedHabits($today);
        $this->seedBrain($vault);

        $this->command?->info('Usuário demo: '.self::EMAIL.' / '.self::PASSWORD);
        $this->command?->info('Vault demo: '.$vault->root());

        Auth::forgetUser();
    }

    private function removeExisting(VaultService $vault): void
    {
        $existing = User::where('email', self::EMAIL)->first();
        if ($existing === null) {
            return;
        }

        Auth::setUser($existing);
        File::deleteDirectory($vault->root());
        Auth::forgetUser();

        // Tarefas, hábitos, categorias e módulos saem por cascade.
        $existing->delete();
    }

    private function seedTasks(CarbonImmutable $today): void
    {
        // [título, status, prazo em dias (null = sem prazo), prioridade, subtarefas]
        $board = [
            ['Trabalho', 'briefcase', '#3b82f6', [
                ['Revisar proposta do cliente', 'doing', 0, true, ['Ler escopo', 'Ajustar prazos', 'Enviar resposta']],
                ['Preparar apresentação trimestral', 'todo', 4, false, []],
                ['Atualizar documentação da API', 'todo', 9, false, []],
                ['Reunião de alinhamento com o time', 'done', -2, false, []],
                ['Corrigir relatório de vendas', 'done', -5, false, []],
            ]],
            ['Estudos', 'graduation-cap', '#f59e0b', [
                ['Terminar capítulo 4 de Arquitetura Limpa', 'doing', 2, false, ['Ler', 'Resumir no Cérebro']],
                ['Exercícios de SQL avançado', 'todo', 6, false, []],
                ['Assistir aula de generics em TypeScript', 'todo', null, false, []],
                ['Revisar flashcards de inglês', 'done', -1, false, []],
            ]],
            ['Casa', 'home', '#10b981', [
                ['Pagar conta de luz', 'todo', 0, true, []],
                ['Organizar armário do escritório', 'todo', null, false, []],
                ['Agendar manutenção do ar-condicionado', 'doing', 5, false, []],
                ['Comprar filtro de água', 'done', -3, false, []],
            ]],
            ['Saúde', 'heart-pulse', '#ef4444', [
                ['Marcar check-up anual', 'todo', 10, false, []],
                ['Comprar tênis de corrida', 'todo', null, false, []],
                ['Montar treino da semana', 'done', -4, false, []],
            ]],
        ];

        $categoryIds = [];
        foreach ($board as $position => [$name, $icon, $color, $tasks]) {
            $category = Category::create(compact('name', 'icon', 'color', 'position'));
            $categoryIds[] = $category->id;

            foreach ($tasks as $taskPosition => [$title, $status, $dueIn, $priority, $subtasks]) {
                $task = Task::create([
                    'title' => $title,
                    'status' => $status,
                    'position' => $taskPosition,
                    'is_priority' => $priority,
                    'category_id' => $category->id,
                    'due_date' => $dueIn === null ? null : $today->addDays($dueIn),
                    'completed_at' => $status === 'done' ? $today->addDays(min($dueIn ?? 0, 0))->setTime(18, 0) : null,
                ]);

                foreach ($subtasks as $i => $subtitle) {
                    Subtask::create(['task_id' => $task->id, 'title' => $subtitle, 'done' => $i === 0, 'position' => $i]);
                }
            }
        }

        // Histórico de conclusões das últimas 12 semanas: alimenta heatmap e dashboards.
        $history = [
            'Responder emails pendentes', 'Revisar pull requests', 'Planejar a semana',
            'Ler artigo sobre testes', 'Lavar o carro', 'Fazer compras do mês',
            'Atualizar planilha de gastos', 'Estudar capítulo de SQL', 'Limpar a geladeira',
            'Enviar relatório semanal',
        ];
        for ($i = 0; $i < 30; $i++) {
            $day = $today->subDays(mt_rand(6, 84));
            Task::create([
                'title' => $history[$i % count($history)],
                'status' => 'done',
                'position' => 100 + $i,
                'category_id' => $categoryIds[mt_rand(0, count($categoryIds) - 1)],
                'completed_at' => $day->setTime(mt_rand(8, 20), 0),
            ]);
        }
    }

    private function seedHabits(CarbonImmutable $today): void
    {
        // [nome, ícone, cor, meta semanal (null = hábito diário), aderência à meta]
        $habits = [
            ['Ler', 'book-open', '#3b82f6', null, 0.85],
            ['Exercício', 'dumbbell', '#ef4444', 3, 0.7],
            ['Meditar', 'brain', '#8b5cf6', 5, 0.75],
            ['Beber água', 'droplet', '#10b981', null, 0.9],
            ['Dormir cedo', 'moon', '#64748b', 5, 0.6],
        ];

        $start = $today->subWeeks(12)->startOfWeek();
        $recentStart = $today->subDays(5);

        foreach ($habits as [$name, $icon, $color, $target, $adherence]) {
            $habit = Habit::create(['name' => $name, 'icon' => $icon, 'color' => $color, 'target_per_week' => $target]);
            // Hábito diário (meta nula) conta como alvo de 7/semana na fórmula de chance.
            $chance = $adherence * ($target ?? 7) / 7;

            // Últimos 6 dias (de hoje para trás, hoje incluso) fecham 100%:
            // "Dias perfeitos", streaks e o gráfico de consistência diária
            // não zeram bem no fim do período mostrado nas telas.
            for ($day = $start; $day->lte($today); $day = $day->addDay()) {
                $done = $day->gte($recentStart) || mt_rand() / mt_getrandmax() < $chance;
                if ($done) {
                    HabitLog::create(['habit_id' => $habit->id, 'date' => $day->toDateString(), 'done' => true, 'skipped' => false]);
                }
            }
        }
    }

    private function seedBrain(VaultService $vault): void
    {
        File::ensureDirectoryExists($vault->root().'/00-Inbox/processados');

        // [caminho, status, tags, corpo com wikilinks]
        $notes = [
            ['Livros/Arquitetura Limpa.md', 'estudando', ['arquitetura', 'software'],
                "Regras de negócio independentes de frameworks, banco e interface.\n\nBase de [[Princípios SOLID]] e de [[Testes automatizados]].\n"],
            ['Livros/Hábitos Atômicos.md', 'concluido', ['habitos', 'produtividade'],
                "Pequenas melhorias diárias se acumulam. Ambiente vale mais que motivação.\n\nAplicado no [[Sistema de revisão semanal]].\n"],
            ['Livros/O Programador Pragmático.md', 'novo', ['software', 'carreira'],
                "Cuidar do ofício, automatizar o repetitivo e evitar janelas quebradas.\n\nConecta com [[Testes automatizados]].\n"],
            ['Cursos/TypeScript avançado.md', 'estudando', ['typescript', 'frontend'],
                "Tipos condicionais, mapped types e inferência.\n\nAnotações em [[Generics em TypeScript]].\n"],
            ['Cursos/SQL para análise de dados.md', 'a-revisar', ['sql', 'dados'],
                "Window functions, CTEs e planos de execução.\n\nVer [[Índices em bancos relacionais]].\n"],
            ['Artigos/Princípios SOLID.md', 'concluido', ['arquitetura'],
                "Responsabilidade única, aberto-fechado, substituição, segregação e inversão.\n\nAparece em [[Arquitetura Limpa]].\n"],
            ['Artigos/Testes automatizados.md', 'estudando', ['testes', 'software'],
                "Pirâmide de testes e testes como documentação viva.\n\nRelaciona com [[Princípios SOLID]].\n"],
            ['Artigos/Índices em bancos relacionais.md', 'novo', ['sql', 'dados'],
                "B-tree, seletividade e índices compostos.\n"],
            ['Artigos/Generics em TypeScript.md', 'novo', ['typescript'],
                "Restrições com extends e inferência em funções genéricas.\n\nParte do curso [[TypeScript avançado]].\n"],
            ['Ideias/Sistema de revisão semanal.md', 'novo', ['produtividade'],
                "Toda sexta: esvaziar inbox, revisar hábitos e escolher três prioridades.\n\nInspirado em [[Hábitos Atômicos]].\n"],
        ];

        foreach ($notes as [$path, $status, $tags, $body]) {
            File::ensureDirectoryExists(dirname($vault->root().'/'.$path));
            $vault->write($path, [
                'status' => $status,
                'tags' => $tags,
                'data_salvo' => now()->subDays(mt_rand(1, 60))->format('Y-m-d'),
            ], $body, mustExist: false);
        }

        $inbox = [
            ['00-Inbox/Podcast sobre foco profundo.md', "https://example.com/podcast-foco\nOuvir no trajeto.\n"],
            ['00-Inbox/Ideia de projeto pessoal.md', "App para registrar leituras com lembretes semanais.\n"],
        ];
        foreach ($inbox as [$path, $body]) {
            $vault->write($path, ['status' => 'novo', 'data_salvo' => now()->format('Y-m-d')], $body, mustExist: false);
        }
    }
}
