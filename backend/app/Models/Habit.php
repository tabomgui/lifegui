<?php
namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Habit extends Model
{
    use HasFactory, BelongsToUser;

    // user_id listado só para factories/for(); controllers usam sempre ->validated().
    protected $fillable = ['name', 'emoji', 'target_per_week', 'color', 'archived_at', 'user_id'];

    protected function casts(): array
    {
        return ['archived_at' => 'datetime', 'target_per_week' => 'integer'];
    }

    public function logs(): HasMany
    {
        return $this->hasMany(HabitLog::class);
    }
}
