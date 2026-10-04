<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    // Só o trait do Sanctum (SPA + token de captura). O Passport (OAuth do
    // servidor MCP) NÃO usa o dele aqui: os dois definem $accessToken de forma
    // incompatível, e o TokenGuard do Passport só precisa de withAccessToken()
    // — o do Sanctum (sem typehint) atende. Scopes de OAuth não são usados.
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id',
        'avatar',
        'locale',
        'timezone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'google_calendar_refresh_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'google_calendar_refresh_token' => 'encrypted',
            'google_calendar_connected_at' => 'datetime',
            'onboarded_at' => 'datetime',
        ];
    }

    /** Agora no fuso do usuário: base de todo "hoje" calculado no servidor. */
    public function localNow(): CarbonImmutable
    {
        return CarbonImmutable::now($this->timezone ?: config('app.timezone'));
    }

    /** Data-calendário (Y-m-d) de hoje no fuso do usuário. */
    public function localToday(): string
    {
        return $this->localNow()->toDateString();
    }
}
