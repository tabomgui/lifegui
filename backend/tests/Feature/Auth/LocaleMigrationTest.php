<?php

use Illuminate\Support\Facades\DB;

test('migração de locale marca usuários existentes como pt-BR', function () {
    $migration = require database_path('migrations/2026_10_02_000001_add_locale_to_users_table.php');
    $migration->down();

    DB::table('users')->insert([
        'name' => 'Antigo', 'email' => 'antigo@x.test', 'password' => 'x',
        'created_at' => now(), 'updated_at' => now(),
    ]);

    $migration->up();

    expect(DB::table('users')->where('email', 'antigo@x.test')->value('locale'))->toBe('pt-BR');
});
