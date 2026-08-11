<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('habits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('emoji')->default('✨');
            $table->unsignedTinyInteger('target_per_week')->nullable();
            $table->string('color')->default('#64748b');
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('habits'); }
};
