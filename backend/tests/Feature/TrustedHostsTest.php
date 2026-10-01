<?php

use Illuminate\Http\Middleware\TrustHosts;

test('localhost e 127.0.0.1 são hosts confiáveis além do APP_URL', function () {
    $hosts = app(TrustHosts::class)->hosts();

    expect($hosts)->toContain('^localhost$')
        ->and($hosts)->toContain('^127\.0\.0\.1$')
        ->and(count($hosts))->toBe(3);
});
