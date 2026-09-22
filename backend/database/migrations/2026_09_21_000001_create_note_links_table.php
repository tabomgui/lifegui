<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vínculo tarefa/hábito ↔ nota do vault Obsidian. O vault fica
        // Obsidian-puro, então o vínculo mora aqui, referenciando a nota pelo
        // caminho relativo (renomear a nota no Obsidian quebra o vínculo — a
        // UI expõe revincular).
        Schema::create('note_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('linkable');
            $table->string('note_path', 500);
            $table->timestamps();

            $table->index(['user_id', 'note_path']);
            $table->unique(['linkable_type', 'linkable_id', 'note_path'], 'note_links_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('note_links');
    }
};
