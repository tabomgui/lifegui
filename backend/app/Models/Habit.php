<?php
namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class Habit extends Model
{
    use HasFactory, BelongsToUser;

    // user_id listado só para factories/for(); controllers usam sempre ->validated().
    protected $fillable = ['name', 'icon', 'type', 'target_per_week', 'color', 'estimated_daily_cost', 'archived_at', 'user_id'];

    protected function casts(): array
    {
        return [
            'archived_at' => 'datetime',
            'target_per_week' => 'integer',
            'estimated_daily_cost' => 'decimal:2',
        ];
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }

    public function noteLinks(): MorphMany
    {
        return $this->morphMany(NoteLink::class, 'linkable');
    }
}
