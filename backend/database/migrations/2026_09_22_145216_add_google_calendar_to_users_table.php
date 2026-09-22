<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Criptografado via cast `encrypted`; text porque o payload cifrado é longo.
            $table->text('google_calendar_refresh_token')->nullable();
            $table->timestamp('google_calendar_connected_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_calendar_refresh_token', 'google_calendar_connected_at']);
        });
    }
};
