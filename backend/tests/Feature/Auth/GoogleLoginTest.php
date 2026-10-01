<?php

use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;

beforeEach(fn () => config(['lifegui.registration_enabled' => true]));

function fakeGoogleUser(string $email): void
{
    $abstractUser = Mockery::mock(SocialiteUser::class);
    $abstractUser->shouldReceive('getId')->andReturn('google-123');
    $abstractUser->shouldReceive('getEmail')->andReturn($email);
    $abstractUser->shouldReceive('getName')->andReturn('Gui');
    $abstractUser->shouldReceive('getAvatar')->andReturn('http://avatar');

    $provider = Mockery::mock('Laravel\Socialite\Contracts\Provider');
    $provider->shouldReceive('stateless')->andReturnSelf();
    $provider->shouldReceive('user')->andReturn($abstractUser);
    Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
}

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

test('callback do Google vincula conta existente pelo email sem duplicar', function () {
    $existing = User::factory()->create([
        'email' => 'gui@gmail.com',
        'google_id' => null,
        'avatar' => null,
    ]);

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

    expect(User::count())->toBe(1);

    $this->assertDatabaseHas('users', [
        'id' => $existing->id,
        'email' => 'gui@gmail.com',
        'google_id' => 'google-123',
        'avatar' => 'http://avatar',
    ]);

    $this->assertAuthenticatedAs($existing->fresh());
});

test('com cadastro fechado, callback do Google não cria usuário novo', function () {
    config(['lifegui.registration_enabled' => false]);
    fakeGoogleUser('novo@gmail.com');

    $this->get('/api/auth/google/callback')
        ->assertRedirect(config('app.frontend_url').'/login?error=registration_closed');

    $this->assertDatabaseMissing('users', ['email' => 'novo@gmail.com']);
    $this->assertGuest();
});

test('com cadastro fechado, callback do Google loga conta existente', function () {
    config(['lifegui.registration_enabled' => false]);
    $existing = User::factory()->create(['email' => 'gui@gmail.com']);
    fakeGoogleUser('gui@gmail.com');

    $this->get('/api/auth/google/callback')
        ->assertRedirect(config('app.frontend_url').'/dashboard');

    $this->assertAuthenticatedAs($existing->fresh());
});
