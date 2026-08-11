<?php
namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory, BelongsToUser;

    protected $fillable = ['name', 'color', 'icon', 'position', 'user_id'];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
