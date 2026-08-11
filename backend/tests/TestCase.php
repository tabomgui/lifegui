<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Requests in tests act as if they come from the SPA frontend, so
     * Sanctum's EnsureFrontendRequestsAreStateful middleware (enabled via
     * statefulApi()) starts a cookie session, matching real browser
     * requests from the configured stateful domain.
     *
     * @var array<string, string>
     */
    protected $defaultHeaders = [
        'Referer' => 'http://localhost:5173',
    ];
}
