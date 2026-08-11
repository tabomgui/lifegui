<?php
namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

trait BelongsToUser
{
    protected static function bootBelongsToUser(): void
    {
        // Fail-open when there's no authenticated user (needed for factories/seeders
        // running outside a request). This means the scope is NOT a safety net for
        // unauthenticated access — every route touching a BelongsToUser model MUST
        // sit behind auth:sanctum; that middleware is the only real barrier.
        static::addGlobalScope('user', function (Builder $builder) {
            if (Auth::hasUser()) {
                $builder->where($builder->getModel()->getTable().'.user_id', Auth::id());
            }
        });

        static::creating(function ($model) {
            if (! $model->user_id && Auth::hasUser()) {
                $model->user_id = Auth::id();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
