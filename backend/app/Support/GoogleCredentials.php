<?php

namespace App\Support;

class GoogleCredentials
{
    /**
     * Login e agenda Google só funcionam com um OAuth client configurado na instância.
     */
    public static function configured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }
}
