<?php
namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory, BelongsToUser;

    // user_id is fillable only so factories/`for()` can set it directly.
    // Controllers must NEVER pass raw request input to create()/update() —
    // always go through a FormRequest's ->validated() (which never includes
    // user_id), otherwise this becomes a mass-assignment vector.
    protected $fillable = ['name', 'color', 'icon', 'position', 'user_id'];

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }
}
