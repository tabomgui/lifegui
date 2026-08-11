<?php

use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;

test('callback do Google cria usuário e loga', function () {
    $abstractUser = Mockery::mock(SocialiteUser::class);
    $abstractUser->shouldReceive('getId')->andReturn('google-123');
    $abstractUser->shouldReceive('getEmail')->andReturn('gui@gmail.com');
    $abstractUser->shouldReceive('getName')->andReturn('Gui');
    $abstractUser->shouldReceive('getAvatar')->andReturn('http://avatar');

    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('stateless')->andReturnSelf();
    $provider->shouldReceive('user')->andReturn($abstractUser);
    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

    $this->get('/api/auth/google/callback')
        ->assertRedirect(config('app.frontend_url').'/dashboard');

    $this->assertDatabaseHas('users', [
        'email' => 'gui@gmail.com',
        'google_id' => 'google-123',
    ]);
});
