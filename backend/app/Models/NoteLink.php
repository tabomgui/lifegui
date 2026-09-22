<?php

namespace App\Models;

use App\Models\Concerns\BelongsToUser;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class NoteLink extends Model
{
    use BelongsToUser, HasFactory;

    // user_id listado só para factories/for(); controllers usam sempre ->validated().
    protected $fillable = ['note_path', 'linkable_type', 'linkable_id', 'user_id'];

    public function linkable(): MorphTo
    {
        return $this->morphTo();
    }
}
