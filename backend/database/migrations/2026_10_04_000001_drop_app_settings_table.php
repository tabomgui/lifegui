<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A raiz dos vaults era a única configuração global e qualquer usuário
        // logado podia trocá-la. Agora vem só do deploy (VAULTS_PATH em
        // backend/.env); quem tinha uma raiz salva aqui precisa movê-la pra lá.
        Schema::dropIfExists('app_settings');
    }

    public function down(): void
    {
        Schema::create('app_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }
};
