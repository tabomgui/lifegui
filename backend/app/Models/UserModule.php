<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserModule extends Model
{
    use BelongsToUser, HasFactory;

    // user_id listado só para factories/for(); controllers usam sempre ->validated().
    protected $fillable = ['key', 'enabled', 'user_id'];

    protected function casts(): array
    {
        return ['enabled' => 'boolean'];
    }
}
