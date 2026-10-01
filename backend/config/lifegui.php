<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cadastro público
    |--------------------------------------------------------------------------
    |
    | Controla /api/register e a criação de conta pelo login Google. Desligado
    | por padrão: a primeira conta nasce em /setup e as demais só entram com
    | REGISTRATION_ENABLED=true.
    |
    */
    'registration_enabled' => (bool) env('REGISTRATION_ENABLED', false),
];
