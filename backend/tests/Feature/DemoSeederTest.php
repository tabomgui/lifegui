<?php

use App\Models\Category;
use App\Models\Habit;
use App\Models\HabitLog;
use App\Models\Task;
use App\Models\User;
use App\Models\UserModule;
use Database\Seeders\DemoSeeder;
use Illuminate\Support\Facades\File;

beforeEach(function () {
    $this->vaultRoot = sys_get_temp_dir().'/lifegui-demo-'.uniqid();
    config(['vault.root' => $this->vaultRoot]);
});

afterEach(function () {
    File::deleteDirectory($this->vaultRoot);
});

test('DemoSeeder cria usuário demo com dados em todos os módulos', function () {
    $this->seed(DemoSeeder::class);

    $user = User::where('email', DemoSeeder::EMAIL)->firstOrFail();
    $vault = $this->vaultRoot.'/'.$user->id;

    expect($user->onboarded_at)->not->toBeNull()
        ->and(UserModule::where('user_id', $user->id)->where('enabled', true)->count())->toBe(3)
        ->and(Category::where('user_id', $user->id)->count())->toBe(4)
        ->and(Task::where('user_id', $user->id)->count())->toBeGreaterThanOrEqual(40)
        ->and(Habit::where('user_id', $user->id)->count())->toBe(5)
        ->and(HabitLog::whereIn('habit_id', Habit::where('user_id', $user->id)->pluck('id'))->count())->toBeGreaterThan(150)
        ->and(File::files($vault.'/Livros'))->toHaveCount(3)
        ->and(File::files($vault.'/00-Inbox'))->toHaveCount(2);
});

test('DemoSeeder é idempotente', function () {
    $this->seed(DemoSeeder::class);
    $this->seed(DemoSeeder::class);

    expect(User::where('email', DemoSeeder::EMAIL)->count())->toBe(1)
        ->and(Category::count())->toBe(4)
        ->and(File::directories($this->vaultRoot))->toHaveCount(1);
});

test('DemoSeeder não usa emoji em nenhum texto', function () {
    $source = file_get_contents(database_path('seeders/DemoSeeder.php'));

    expect(preg_match('/[\x{1F000}-\x{1FAFF}\x{2600}-\x{27BF}]/u', $source))->toBe(0);
});
