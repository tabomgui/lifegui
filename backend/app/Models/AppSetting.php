<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Configuração global da instância (não é por usuário — sem BelongsToUser).
 */
class AppSetting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key): ?string
    {
        return static::query()->where('key', $key)->value('value');
    }

    public static function put(string $key, ?string $value): void
    {
        static::query()->updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
