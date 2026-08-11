<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('habits', function (Blueprint $table) {
            $table->renameColumn('emoji', 'icon');
        });

        Schema::table('habits', function (Blueprint $table) {
            $table->string('icon')->default('circle-check')->change();
        });

        DB::table('habits')->update(['icon' => 'circle-check']);
    }

    public function down(): void
    {
        Schema::table('habits', function (Blueprint $table) {
            $table->renameColumn('icon', 'emoji');
        });

        Schema::table('habits', function (Blueprint $table) {
            $table->string('emoji')->default('✨')->change();
        });
    }
};
