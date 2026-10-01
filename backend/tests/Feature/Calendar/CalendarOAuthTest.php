<?php

use App\Models\User;

test('redirect sem credenciais Google volta pra configurações com erro', function () {
    config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

    $this->actingAs(User::factory()->create());

    $this->get('/api/auth/google-calendar/redirect')
        ->assertRedirect(config('app.frontend_url').'/configuracoes?calendar=error');
});
