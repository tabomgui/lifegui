<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HabitLog extends Model
{
    use HasFactory;

    protected $fillable = ['habit_id', 'date', 'done', 'skipped'];

    protected function casts(): array
    {
        return ['date' => 'date:Y-m-d', 'done' => 'boolean', 'skipped' => 'boolean'];
    }

    public function habit(): BelongsTo
    {
        return $this->belongsTo(Habit::class);
    }
}
