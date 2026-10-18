<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Fuso do usuário: define o "hoje" do servidor (streak, MCP, datas de
        // notas). O SPA sincroniza com o fuso do navegador.
        Schema::table('users', function (Blueprint $table) {
            $table->string('timezone', 64)->default('UTC')->after('locale');
        });

        // Até aqui o MCP assumia America/Sao_Paulo pra todo mundo: mantém.
        DB::table('users')->update(['timezone' => 'America/Sao_Paulo']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('timezone');
        });
    }
};
